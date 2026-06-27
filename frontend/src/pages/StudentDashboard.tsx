import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Sliders, 
  Search, 
  History, 
  GraduationCap, 
  LogOut, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface StudentDashboardProps {
  navigate: (path: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ navigate }) => {
  const { user, logout } = useAuth();
  const [criteria, setCriteria] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState('Semua');
  const [note, setNote] = useState('Rekomendasi Dosen terbaik saya');
  
  // Weights state: { [criteriaId]: weight }
  const [weights, setWeights] = useState<{ [critId: string]: number }>({});
  
  // History list
  const [history, setHistory] = useState<any[]>([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch criteria to set default weights
      const critData = await api.get('/criteria');
      setCriteria(critData);
      
      const initialWeights: { [critId: string]: number } = {};
      critData.forEach((c: any) => {
        initialWeights[c.id] = c.default_weight;
      });
      setWeights(initialWeights);

      // 2. Fetch lecturers to extract unique departments
      const lecturers = await api.get('/lecturers');
      const depts: string[] = ['Semua'];
      lecturers.forEach((l: any) => {
        if (l.department && !depts.includes(l.department)) {
          depts.push(l.department);
        }
      });
      setDepartments(depts);

      // 3. Fetch search history
      const historyData = await api.get('/recommendations');
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWeightChange = (critId: string, val: number) => {
    setWeights({
      ...weights,
      [critId]: val
    });
  };

  const handleEqualizeWeights = () => {
    if (criteria.length === 0) return;
    const equalWeight = Math.round(100 / criteria.length);
    const updated: { [critId: string]: number } = {};
    criteria.forEach((c) => {
      updated[c.id] = equalWeight;
    });
    // Adjust last one if sum is not exactly 100 due to rounding
    const sum = Object.values(updated).reduce((s, w) => s + w, 0);
    if (sum !== 100 && criteria.length > 0) {
      updated[criteria[criteria.length - 1].id] += (100 - sum);
    }
    setWeights(updated);
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + Number(w), 0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const weightsPayload = Object.entries(weights).map(([criteriaId, weight]) => ({
        criteriaId,
        weight
      }));

      const res = await api.post('/recommendations', {
        department: selectedDept,
        note,
        weights: weightsPayload
      });

      // Redirect to the result page with the requestId
      navigate(`/recommendations/${res.requestId}/result`);
    } catch (err: any) {
      setError(err.message || 'Gagal menghitung rekomendasi SAW.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={26} color="var(--primary)" />
          <span>LecRank</span>
        </div>
        <ul className="sidebar-menu">
          <li className="sidebar-item active">
            <a>
              <Sliders size={18} />
              <span>Rekomendasi Dosen</span>
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info" style={{ marginBottom: '15px' }}>
            <div className="user-avatar" style={{ border: '2px solid var(--primary)' }}>
              <GraduationCap size={20} color="var(--primary)" />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.tenantName || 'Mahasiswa'}</span>
            </div>
          </div>
          <button onClick={logout} className="sidebar-logout-btn">
            <LogOut size={16} color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Rekomendasi Dosen Terbaik</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>
              Atur preferensi bobot kriteria Anda untuk menghitung rekomendasi dosen dengan metode SAW
            </p>
          </div>
          <span className="badge badge-primary" style={{ padding: '8px 14px' }}>
            {user?.tenantName}
          </span>
        </header>

        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}

        <div className="grid-cols-2">
          {/* Slider Preference Form */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} color="var(--primary)" /> Preferensi Anda
              </h2>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleEqualizeWeights}
              >
                Ratakan Bobot (20% Rata)
              </button>
            </div>

            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label className="form-label">Pilih Program Studi (Prodi)</label>
                <select 
                  className="form-control"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept} style={{ color: 'var(--text-inverse)' }}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Request (Opsional)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Misal: Mencari dosen bimbingan skripsi / uas"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '25px', marginBottom: '20px' }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Geser Tingkat Kepentingan Kriteria</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Total: <strong style={{ color: 'var(--accent)' }}>{totalWeight}%</strong>
                  </span>
                </div>

                {criteria.map((c) => (
                  <div className="slider-container" key={c.id}>
                    <div className="slider-header">
                      <span>{c.code} - {c.name}</span>
                      <span style={{ color: 'var(--primary)' }}>{weights[c.id] || 0}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      className="slider-input"
                      value={weights[c.id] || 0}
                      onChange={(e) => handleWeightChange(c.id, Number(e.target.value))}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>Sangat Tidak Penting (0%)</span>
                      <span>Sangat Penting (100%)</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginTop: '8px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Info size={12} color="var(--primary)" />
                      <span>Tipe: {c.type === 'benefit' ? 'Benefit (semakin tinggi skor dosen, semakin baik)' : 'Cost (semakin rendah beban tugas, semakin baik)'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px', marginTop: '10px' }}
                disabled={loading}
              >
                <Search size={18} />
                {loading ? 'Menghitung SAW...' : 'Cari Rekomendasi Dosen'}
              </button>
            </form>
          </div>

          {/* Search History Panel */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <History size={20} color="var(--accent)" /> Riwayat Pencarian Anda
            </h2>

            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '550px' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={32} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div>Belum ada riwayat pencarian rekomendasi.</div>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Silakan buat request pertama Anda di panel sebelah kiri.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {history.map((h) => (
                    <div 
                      key={h.id} 
                      className="glass-panel" 
                      style={{ padding: '18px', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => navigate(`/recommendations/${h.id}/result`)}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{h.note || 'Rekomendasi Dosen'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Prodi: <span style={{ color: 'var(--text-main)' }}>{h.department}</span> • Jumlah Alternatif: <span style={{ color: 'var(--text-main)' }}>{h.total_lecturers}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold', marginTop: '6px' }}>
                          Hasil Terbaik: {h.best_lecturer || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
