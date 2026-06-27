import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery } from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { calculateSAW } from '../services/saw.service';

export async function createRecommendation(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const tenantId = user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Mahasiswa harus terdaftar di salah satu Fakultas/Jurusan.' });
    }

    const { department, weights, note } = req.body; // weights: Array of { criteriaId: string, weight: number }

    if (!weights || !Array.isArray(weights)) {
      return res.status(400).json({ message: 'Data preferensi bobot wajib dikirimkan.' });
    }

    // Run SAW calculations
    const sawData = await calculateSAW(tenantId, weights, department);

    if (sawData.ranking.length === 0) {
      return res.status(400).json({ 
        message: 'Tidak ada data dosen aktif dengan nilai kriteria lengkap untuk dijalankan perhitungan SAW.' 
      });
    }

    // Save request to database for history
    const requestId = uuidv4();
    await dbQuery.run(
      `INSERT INTO recommendation_requests (id, tenant_id, user_id, department, note) 
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, tenantId, user.id, department || 'Semua', note || 'Rekomendasi Dosen Terbaik']
    );

    // Save chosen weights
    for (const w of weights) {
      await dbQuery.run(
        `INSERT INTO recommendation_request_weights (id, recommendation_request_id, criteria_id, weight) 
         VALUES (?, ?, ?, ?)`,
        [uuidv4(), requestId, w.criteriaId, Number(w.weight)]
      );
    }

    // Save final scores and rankings
    for (const item of sawData.ranking) {
      await dbQuery.run(
        `INSERT INTO recommendation_results (id, recommendation_request_id, lecturer_id, final_score, rank_position) 
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), requestId, item.lecturerId, item.finalScore, item.rank]
      );
    }

    res.status(201).json({
      message: 'Rekomendasi berhasil dihitung dan disimpan.',
      requestId,
      sawData
    });
  } catch (error: any) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ message: 'Gagal memproses perhitungan SPK.', error: error.message });
  }
}

export async function getRecommendationHistory(req: AuthRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const history = await dbQuery.all(
      `SELECT r.*, 
       (SELECT COUNT(*) FROM recommendation_results WHERE recommendation_request_id = r.id) as total_lecturers,
       (SELECT l.name FROM recommendation_results rr 
        JOIN lecturers l ON rr.lecturer_id = l.id 
        WHERE rr.recommendation_request_id = r.id AND rr.rank_position = 1 LIMIT 1) as best_lecturer
       FROM recommendation_requests r
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [user.id]
    );

    res.json(history);
  } catch (error: any) {
    console.error('Get recommendation history error:', error);
    res.status(500).json({ message: 'Gagal mengambil riwayat rekomendasi.', error: error.message });
  }
}

export async function getRecommendationResultById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params; // request id
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Tidak diizinkan.' });

    const request = await dbQuery.get(
      `SELECT r.*, t.name as tenant_name, u.name as student_name 
       FROM recommendation_requests r
       JOIN tenants t ON r.tenant_id = t.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (!request) {
      return res.status(404).json({ message: 'Data request rekomendasi tidak ditemukan.' });
    }

    // Check authorization (must be either the student who requested it, or admin of same tenant)
    if (user.role !== 'super_admin' && user.tenantId !== request.tenant_id) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    if (user.role === 'student' && user.id !== request.user_id) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    // Get saved weights
    const savedWeights = await dbQuery.all(
      `SELECT rrw.criteria_id as criteriaId, rrw.weight, c.code, c.name 
       FROM recommendation_request_weights rrw
       JOIN criteria c ON rrw.criteria_id = c.id
       WHERE rrw.recommendation_request_id = ?`,
      [id]
    );

    // Recalculate SAW to get step-by-step logs using the saved weights and filter
    const weightsInput = savedWeights.map((sw) => ({
      criteriaId: sw.criteriaId,
      weight: sw.weight
    }));

    const sawData = await calculateSAW(request.tenant_id, weightsInput, request.department);

    res.json({
      request,
      weights: savedWeights,
      sawData
    });
  } catch (error: any) {
    console.error('Get recommendation result by ID error:', error);
    res.status(500).json({ message: 'Gagal mengambil hasil detail rekomendasi.', error: error.message });
  }
}
