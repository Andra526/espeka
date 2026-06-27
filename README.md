# LecRank SaaS — Rekomendasi Dosen Terbaik

**UAS Gabungan: Pemrograman Web & Sistem Pendukung Keputusan**

Aplikasi SaaS multi-tenant untuk merekomendasikan dosen terbaik menggunakan metode **Simple Additive Weighting (SAW)**. Setiap Fakultas/Jurusan bertindak sebagai *tenant* mandiri.

---

## Cara Menjalankan

### Backend (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
# Buka: http://localhost:5173
```

> Database SQLite dibuat otomatis di `backend/database.sqlite`

---

## Akun Default

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@lecrank.com` | `admin123` |
| Admin FTI | `adminfti@lecrank.com` | `admin123` |
| Admin FEB | `adminfeb@lecrank.com` | `admin123` |
| Mahasiswa | `mahasiswa@lecrank.com` | `admin123` |

---

## Kriteria SPK (C1–C5)

| Kode | Nama | Tipe | Bobot |
|------|------|------|-------|
| C1 | Lama Mengabdi | Benefit | 25% |
| C2 | Cara Mengajar | Benefit | 25% |
| C3 | Ketepatan Waktu Hadir | Benefit | 15% |
| C4 | Tingkat Keramahan | Benefit | 20% |
| C5 | Pemberian Tugas | Cost | 10% |

---

## Tech Stack

- **Backend:** Node.js + Express + TypeScript + SQLite + JWT
- **Frontend:** React 18 + TypeScript + Vite + Custom CSS

Tes Git