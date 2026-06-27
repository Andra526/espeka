import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { dbQuery } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

// --- Tenant Management ---

export async function getTenants(req: AuthRequest, res: Response) {
  try {
    const tenants = await dbQuery.all('SELECT * FROM tenants ORDER BY name ASC');
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil data Fakultas/Jurusan.', error: error.message });
  }
}

export async function createTenant(req: AuthRequest, res: Response) {
  try {
    const { name, email, phone, address, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: 'Nama dan Slug Fakultas/Jurusan wajib diisi.' });
    }

    // Check slug uniqueness
    const existing = await dbQuery.get('SELECT id FROM tenants WHERE slug = ?', [slug]);
    if (existing) {
      return res.status(400).json({ message: 'Slug sudah digunakan oleh fakultas/jurusan lain.' });
    }

    const tenantId = uuidv4();
    await dbQuery.run(
      `INSERT INTO tenants (id, name, slug, email, phone, address, subscription_status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [tenantId, name, slug.toLowerCase(), email || null, phone || null, address || null]
    );

    // Automatically seed default criteria C1-C5 for the new tenant
    const criteriaData = [
      { code: 'C1', name: 'Lama Mengabdi', type: 'benefit', default_weight: 25, description: 'Lama mengajar dalam tahun' },
      { code: 'C2', name: 'Cara Mengajar', type: 'benefit', default_weight: 25, description: 'Skor evaluasi proses pembelajaran (1-100)' },
      { code: 'C3', name: 'Ketepatan Waktu Hadir', type: 'benefit', default_weight: 15, description: 'Persentase kehadiran tepat waktu (1-100)' },
      { code: 'C4', name: 'Tingkat Keramahan', type: 'benefit', default_weight: 20, description: 'Evaluasi keramahan dan interaksi (1-5)' },
      { code: 'C5', name: 'Pemberian Tugas', type: 'cost', default_weight: 10, description: 'Beban pemberian tugas per semester (1-10, lower is better)' }
    ];

    for (const item of criteriaData) {
      await dbQuery.run(
        `INSERT INTO criteria (id, tenant_id, code, name, type, default_weight, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), tenantId, item.code, item.name, item.type, item.default_weight, item.description]
      );
    }

    res.status(201).json({ message: 'Fakultas/Jurusan berhasil dibuat.', id: tenantId });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal membuat Fakultas/Jurusan.', error: error.message });
  }
}

export async function updateTenant(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, phone, address, subscription_status, slug } = req.body;

    const tenant = await dbQuery.get('SELECT * FROM tenants WHERE id = ?', [id]);
    if (!tenant) {
      return res.status(404).json({ message: 'Fakultas/Jurusan tidak ditemukan.' });
    }

    if (slug && slug !== tenant.slug) {
      const existing = await dbQuery.get('SELECT id FROM tenants WHERE slug = ?', [slug]);
      if (existing) {
        return res.status(400).json({ message: 'Slug sudah digunakan.' });
      }
    }

    await dbQuery.run(
      `UPDATE tenants 
       SET name = ?, slug = ?, email = ?, phone = ?, address = ?, subscription_status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name || tenant.name, slug || tenant.slug, email || null, phone || null, address || null, subscription_status || tenant.subscription_status, id]
    );

    res.json({ message: 'Fakultas/Jurusan berhasil diperbarui.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal memperbarui data.', error: error.message });
  }
}

export async function deleteTenant(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await dbQuery.run('DELETE FROM tenants WHERE id = ?', [id]);
    // Cascade deletes should trigger for lecturers, users, and criteria due to SQLite table references
    // But let's run cleanups for safety
    await dbQuery.run('DELETE FROM users WHERE tenant_id = ?', [id]);
    await dbQuery.run('DELETE FROM lecturers WHERE tenant_id = ?', [id]);
    await dbQuery.run('DELETE FROM criteria WHERE tenant_id = ?', [id]);
    await dbQuery.run('DELETE FROM lecturer_criteria_values WHERE tenant_id = ?', [id]);

    res.json({ message: 'Fakultas/Jurusan beserta semua data terkait berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal menghapus Fakultas/Jurusan.', error: error.message });
  }
}

// --- User Management (Super Admin) ---

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const users = await dbQuery.all(
      `SELECT u.id, u.name, u.email, u.role, u.tenant_id, t.name as tenant_name 
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       ORDER BY u.role ASC, u.name ASC`
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil data user.', error: error.message });
  }
}

export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { name, email, password, role, tenantId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Semua kolom wajib diisi.' });
    }

    const existing = await dbQuery.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    if (role !== 'super_admin' && !tenantId) {
      return res.status(400).json({ message: 'Fakultas/Jurusan wajib dipilih untuk role ini.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = uuidv4();

    await dbQuery.run(
      'INSERT INTO users (id, tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, tenantId || null, name, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User berhasil dibuat.', id: newId });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal membuat user.', error: error.message });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (id === req.user?.id) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    }
    await dbQuery.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User berhasil dihapus.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal menghapus user.', error: error.message });
  }
}

// --- System Statistics ---

export async function getSystemStats(req: AuthRequest, res: Response) {
  try {
    const tenantCount = await dbQuery.get('SELECT COUNT(*) as count FROM tenants');
    const userCount = await dbQuery.get('SELECT COUNT(*) as count FROM users');
    const lecturerCount = await dbQuery.get('SELECT COUNT(*) as count FROM lecturers');
    const requestCount = await dbQuery.get('SELECT COUNT(*) as count FROM recommendation_requests');

    res.json({
      tenants: tenantCount.count,
      users: userCount.count,
      lecturers: lecturerCount.count,
      requests: requestCount.count
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil statistik sistem.', error: error.message });
  }
}
