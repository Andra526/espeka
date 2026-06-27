import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getLecturers(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    let tenantId = user.tenantId;
    
    // Super admin can request lecturers of a specific tenant, or all
    if (user.role === 'super_admin') {
      const queryTenantId = req.query.tenantId as string;
      if (queryTenantId) {
        tenantId = queryTenantId;
      } else {
        // Fetch all lecturers across all tenants
        const lecturers = await dbQuery.all(
          `SELECT l.*, t.name as tenant_name 
           FROM lecturers l
           JOIN tenants t ON l.tenant_id = t.id
           ORDER BY l.name ASC`
        );
        return res.json(lecturers);
      }
    }

    if (!tenantId) {
      return res.status(400).json({ message: 'ID Jurusan/Fakultas tidak ditemukan.' });
    }

    // Get lecturers
    const lecturers = await dbQuery.all(
      'SELECT * FROM lecturers WHERE tenant_id = ? ORDER BY name ASC',
      [tenantId]
    );

    // Get criteria values for all these lecturers
    if (lecturers.length > 0) {
      const lecturerIds = lecturers.map((l) => l.id);
      const placeholders = lecturerIds.map(() => '?').join(',');
      const rawValues = await dbQuery.all(
        `SELECT lcv.*, c.code 
         FROM lecturer_criteria_values lcv
         JOIN criteria c ON lcv.criteria_id = c.id
         WHERE lcv.tenant_id = ? AND lcv.lecturer_id IN (${placeholders})`,
        [tenantId, ...lecturerIds]
      );

      // Attach values to lecturers
      lecturers.forEach((l) => {
        l.values = {};
        rawValues
          .filter((v) => v.lecturer_id === l.id)
          .forEach((v) => {
            l.values[v.criteria_id] = Number(v.value);
            l.values[v.code] = Number(v.value); // support both code and id reference
          });
      });
    }

    res.json(lecturers);
  } catch (error: any) {
    console.error('Get lecturers error:', error);
    res.status(500).json({ message: 'Gagal mengambil data dosen.', error: error.message });
  }
}

export async function getLecturerById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const lecturer = await dbQuery.get('SELECT * FROM lecturers WHERE id = ?', [id]);
    if (!lecturer) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan.' });
    }

    // Check tenant isolation
    if (user.role !== 'super_admin' && lecturer.tenant_id !== user.tenantId) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke dosen di fakultas lain.' });
    }

    // Fetch criteria values
    const values = await dbQuery.all(
      `SELECT lcv.*, c.code, c.name as criteria_name, c.type as criteria_type
       FROM criteria c
       LEFT JOIN lecturer_criteria_values lcv ON c.id = lcv.criteria_id AND lcv.lecturer_id = ?
       WHERE c.tenant_id = ?`,
      [id, lecturer.tenant_id]
    );

    res.json({
      lecturer,
      criteriaValues: values.map((v) => ({
        criteriaId: v.id || v.criteria_id,
        code: v.code,
        name: v.criteria_name,
        type: v.criteria_type,
        value: v.value !== null && v.value !== undefined ? Number(v.value) : 0
      }))
    });
  } catch (error: any) {
    console.error('Get lecturer by ID error:', error);
    res.status(500).json({ message: 'Gagal mengambil data detail dosen.', error: error.message });
  }
}

export async function createLecturer(req: AuthRequest, res: Response) {
  try {
    const { name, nidn, email, department, avatarUrl } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const tenantId = user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Admin harus memiliki Jurusan/Fakultas.' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Nama dosen wajib diisi.' });
    }

    // Check NIDN uniqueness
    if (nidn) {
      const existingLec = await dbQuery.get('SELECT * FROM lecturers WHERE nidn = ?', [nidn]);
      if (existingLec) {
        return res.status(400).json({ message: `Dosen dengan NIDN ${nidn} sudah terdaftar.` });
      }
    }

    const newId = uuidv4();
    const resolvedAvatar = avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, '')}`;

    await dbQuery.run(
      `INSERT INTO lecturers (id, tenant_id, name, nidn, email, department, avatar_url, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [newId, tenantId, name, nidn || null, email || null, department || null, resolvedAvatar]
    );

    // Initialize empty values for all tenant criteria
    const criteria = await dbQuery.all('SELECT id FROM criteria WHERE tenant_id = ?', [tenantId]);
    for (const c of criteria) {
      await dbQuery.run(
        `INSERT INTO lecturer_criteria_values (id, tenant_id, lecturer_id, criteria_id, value) 
         VALUES (?, ?, ?, ?, 0.0)`,
        [uuidv4(), tenantId, newId, c.id]
      );
    }

    res.status(201).json({ message: 'Dosen berhasil ditambahkan.', id: newId });
  } catch (error: any) {
    console.error('Create lecturer error:', error);
    res.status(500).json({ message: 'Gagal menambahkan data dosen.', error: error.message });
  }
}

export async function updateLecturer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, nidn, email, department, avatarUrl, isActive } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const lecturer = await dbQuery.get('SELECT * FROM lecturers WHERE id = ?', [id]);
    if (!lecturer) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan.' });
    }

    if (user.role !== 'super_admin' && lecturer.tenant_id !== user.tenantId) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    // Check NIDN uniqueness
    if (nidn && nidn !== lecturer.nidn) {
      const existingLec = await dbQuery.get('SELECT * FROM lecturers WHERE nidn = ?', [nidn]);
      if (existingLec) {
        return res.status(400).json({ message: `Dosen dengan NIDN ${nidn} sudah terdaftar.` });
      }
    }

    const resolvedAvatar = avatarUrl || lecturer.avatar_url;
    const resolvedIsActive = isActive !== undefined ? (isActive ? 1 : 0) : lecturer.is_active;

    await dbQuery.run(
      `UPDATE lecturers 
       SET name = ?, nidn = ?, email = ?, department = ?, avatar_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name || lecturer.name, nidn || null, email || null, department || null, resolvedAvatar, resolvedIsActive, id]
    );

    res.json({ message: 'Profil dosen berhasil diperbarui.' });
  } catch (error: any) {
    console.error('Update lecturer error:', error);
    res.status(500).json({ message: 'Gagal memperbarui profil dosen.', error: error.message });
  }
}

export async function deleteLecturer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const lecturer = await dbQuery.get('SELECT * FROM lecturers WHERE id = ?', [id]);
    if (!lecturer) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan.' });
    }

    if (user.role !== 'super_admin' && lecturer.tenant_id !== user.tenantId) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    await dbQuery.run('DELETE FROM lecturers WHERE id = ?', [id]);
    // lecturer_criteria_values will delete via ON DELETE CASCADE if setup, but let's run it manually just in case
    await dbQuery.run('DELETE FROM lecturer_criteria_values WHERE lecturer_id = ?', [id]);

    res.json({ message: 'Dosen berhasil dihapus dari sistem.' });
  } catch (error: any) {
    console.error('Delete lecturer error:', error);
    res.status(500).json({ message: 'Gagal menghapus data dosen.', error: error.message });
  }
}

export async function updateLecturerValues(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // lecturer_id
    const { values } = req.body; // object: { [criteriaId]: value }
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const lecturer = await dbQuery.get('SELECT * FROM lecturers WHERE id = ?', [id]);
    if (!lecturer) {
      return res.status(404).json({ message: 'Dosen tidak ditemukan.' });
    }

    if (user.role !== 'super_admin' && lecturer.tenant_id !== user.tenantId) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    if (!values || typeof values !== 'object') {
      return res.status(400).json({ message: 'Format nilai tidak valid.' });
    }

    const tenantId = lecturer.tenant_id;

    for (const [criteriaId, score] of Object.entries(values)) {
      // Validate that the criteria belongs to the tenant
      const criteria = await dbQuery.get('SELECT id FROM criteria WHERE id = ? AND tenant_id = ?', [criteriaId, tenantId]);
      if (!criteria) continue;

      // Upsert value
      const existing = await dbQuery.get(
        'SELECT id FROM lecturer_criteria_values WHERE lecturer_id = ? AND criteria_id = ?',
        [id, criteriaId]
      );

      if (existing) {
        await dbQuery.run(
          `UPDATE lecturer_criteria_values SET value = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE lecturer_id = ? AND criteria_id = ?`,
          [Number(score), id, criteriaId]
        );
      } else {
        await dbQuery.run(
          `INSERT INTO lecturer_criteria_values (id, tenant_id, lecturer_id, criteria_id, value) 
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), tenantId, id, criteriaId, Number(score)]
        );
      }
    }

    res.json({ message: 'Nilai evaluasi kriteria dosen berhasil diperbarui.' });
  } catch (error: any) {
    console.error('Update lecturer criteria values error:', error);
    res.status(500).json({ message: 'Gagal memperbarui nilai evaluasi dosen.', error: error.message });
  }
}
