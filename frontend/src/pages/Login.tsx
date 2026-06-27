import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, GraduationCap } from 'lucide-react';

interface LoginProps {
  navigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // AuthContext automatically checks auth and updates the user state.
      // Redirect is handled in App.tsx based on the updated user role.
    } catch (err: any) {
      setError(err.message || 'Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '16px', 
            borderRadius: '50%', 
            background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid rgba(99, 102, 241, 0.2)',
            color: 'var(--primary)',
            marginBottom: '15px'
          }}>
            <GraduationCap size={40} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '4px' }}>LecRank SaaS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Rekomendasi Dosen Terbaik Metode SAW
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Kampus</label>
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

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
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
            <LogIn size={18} />
            {loading ? 'Memproses...' : 'Masuk ke Akun'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Belum punya akun? </span>
          <button 
            onClick={() => navigate('/register')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary)', 
              fontWeight: '600', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Daftar Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};
