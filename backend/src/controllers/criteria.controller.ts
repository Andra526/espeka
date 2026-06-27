import { Response } from 'express';
import { dbQuery } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getCriteria(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    let tenantId = user.tenantId;

    if (user.role === 'super_admin') {
      const queryTenantId = req.query.tenantId as string;
      if (queryTenantId) {
        tenantId = queryTenantId;
      } else {
        // Return all criteria in the system
        const criteria = await dbQuery.all(
          `SELECT c.*, t.name as tenant_name 
           FROM criteria c
           JOIN tenants t ON c.tenant_id = t.id
           ORDER BY t.name ASC, c.code ASC`
        );
        return res.json(criteria);
      }
    }

    if (!tenantId) {
      return res.status(400).json({ message: 'ID Jurusan/Fakultas tidak ditemukan.' });
    }

    const criteria = await dbQuery.all(
      'SELECT * FROM criteria WHERE tenant_id = ? ORDER BY code ASC',
      [tenantId]
    );

    res.json(criteria);
  } catch (error: any) {
    console.error('Get criteria error:', error);
    res.status(500).json({ message: 'Gagal mengambil data kriteria.', error: error.message });
  }
}

export async function updateCriteriaWeights(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const tenantId = user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Akses ditolak.' });
    }

    const { weights } = req.body; // Array of { id: string, default_weight: number }
    if (!weights || !Array.isArray(weights)) {
      return res.status(400).json({ message: 'Format data bobot tidak valid.' });
    }

    // Verify sum of weights is 100
    const totalWeight = weights.reduce((sum, w) => sum + Number(w.default_weight), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return res.status(400).json({ message: `Total bobot harus sama dengan 100%. Total saat ini: ${totalWeight}%` });
    }

    for (const item of weights) {
      await dbQuery.run(
        'UPDATE criteria SET default_weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
        [Number(item.default_weight), item.id, tenantId]
      );
    }

    res.json({ message: 'Bobot kriteria default berhasil diperbarui.' });
  } catch (error: any) {
    console.error('Update criteria weights error:', error);
    res.status(500).json({ message: 'Gagal memperbarui bobot kriteria.', error: error.message });
  }
}
