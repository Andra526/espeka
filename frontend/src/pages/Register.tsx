import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserPlus, ChevronLeft } from 'lucide-react';

interface RegisterProps {
  navigate: (path: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ navigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTenants() {
      try {
        const data = await api.get('/auth/tenants');
        setTenants(data);
        if (data.length > 0) {
          setTenantId(data[0].id);
        }
      } catch (err: any) {
        console.error('Gagal mengambil data fakultas/jurusan', err);
      }
    }
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !tenantId) {
      setError('Semua kolom formulir wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        tenantId,
        role: 'student' // hardcoded to student registration
      });
      setSuccess('Registrasi berhasil! Mengalihkan ke login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat registrasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card" style={{ maxWidth: '500px' }}>
        <button 
          onClick={() => navigate('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: '600'
          }}
        >
          <ChevronLeft size={16} /> Kembali ke Login
        </button>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.7rem', fontWeight: '800', marginBottom: '4px' }}>Daftar Akun Baru</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Registrasi sebagai Mahasiswa untuk Rekomendasi Dosen
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nama Lengkap</label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="Masukkan nama lengkap Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="nama@university.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tenant">Fakultas / Jurusan</label>
            <select
              id="tenant"
              className="form-control"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={loading}
              required
              style={{ appearance: 'auto' }}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} style={{ color: 'var(--text-inverse)' }}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Min. 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? 'Mendaftarkan...' : 'Buat Akun Mahasiswa'}
          </button>
        </form>
      </div>
    </div>
  );
};
