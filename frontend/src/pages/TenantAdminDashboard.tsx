import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Users, 
  GraduationCap,
  Award, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Save, 
  LogOut,
  ListOrdered
} from 'lucide-react';

export const TenantAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'lecturers' | 'values' | 'weights'>('lecturers');
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  
  // Modals state
  const [showLecModal, setShowLecModal] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [isEditingLec, setIsEditingLec] = useState(false);
  const [currentLec, setCurrentLec] = useState<any>(null);

  // Lecturer Form
  const [lecName, setLecName] = useState('');
  const [lecNidn, setLecNidn] = useState('');
  const [lecEmail, setLecEmail] = useState('');
  const [lecDepartment, setLecDepartment] = useState('');
  const [lecAvatar, setLecAvatar] = useState('');
  
  // Criteria Values Form
  const [inputScores, setInputScores] = useState<{ [critId: string]: number }>({});
  
  // Criteria Weights Form
  const [weightChanges, setWeightChanges] = useState<{ [critId: string]: number }>({});

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      // Fetch lecturers and criteria for this tenant
      const criteriaData = await api.get('/criteria');
      setCriteria(criteriaData);

      // Prepopulate weight adjustments
      const weightsObj: { [critId: string]: number } = {};
      criteriaData.forEach((c: any) => {
        weightsObj[c.id] = c.default_weight;
      });
      setWeightChanges(weightsObj);

      const lecturersData = await api.get('/lecturers');
      setLecturers(lecturersData);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data dari server.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Lecturer CRUD Actions
  const handleOpenCreateLec = () => {
    clearMessages();
    setIsEditingLec(false);
    setLecName('');
    setLecNidn('');
    setLecEmail('');
    setLecDepartment('');
    setLecAvatar('');
    setShowLecModal(true);
  };

  const handleOpenEditLec = (l: any) => {
    clearMessages();
    setIsEditingLec(true);
    setCurrentLec(l);
    setLecName(l.name);
    setLecNidn(l.nidn || '');
    setLecEmail(l.email || '');
    setLecDepartment(l.department || '');
    setLecAvatar(l.avatar_url || '');
    setShowLecModal(true);
  };

  const handleSaveLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecName) {
      setError('Nama dosen wajib diisi.');
      return;
    }

    try {
      const payload = {
        name: lecName,
        nidn: lecNidn,
        email: lecEmail,
        department: lecDepartment,
        avatarUrl: lecAvatar
      };

      if (isEditingLec) {
        await api.put(`/lecturers/${currentLec.id}`, payload);
        setSuccess('Profil dosen berhasil diperbarui.');
      } else {
        await api.post('/lecturers', payload);
        setSuccess('Dosen baru berhasil ditambahkan.');
      }

      setShowLecModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data dosen.');
    }
  };

  const handleDeleteLecturer = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data dosen ini? Semua nilai kriteria dosen ini akan terhapus.')) return;
    try {
      await api.delete(`/lecturers/${id}`);
      setSuccess('Dosen berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus data dosen.');
    }
  };

  // Criteria Values Actions
  const handleOpenInputValues = (l: any) => {
    clearMessages();
    setCurrentLec(l);
    
    // Build initial score values
    const scores: { [critId: string]: number } = {};
    criteria.forEach((c) => {
      // Find current value or default 0
      scores[c.id] = l.values && l.values[c.id] !== undefined ? l.values[c.id] : 0;
    });

    setInputScores(scores);
    setShowValueModal(true);
  };

  const handleSaveValues = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/lecturers/${currentLec.id}/values`, {
        values: inputScores
      });
      setSuccess(`Nilai evaluasi untuk ${currentLec.name} berhasil diperbarui.`);
      setShowValueModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan nilai kriteria.');
    }
  };

  // Criteria Weight Save
  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Check sum is 100%
    const total = Object.values(weightChanges).reduce((sum, w) => sum + Number(w), 0);
    if (Math.abs(total - 100) > 0.01) {
      setError(`Total bobot kriteria harus tepat 100%. Total saat ini: ${total}%`);
      return;
    }

    try {
      const weightsPayload = Object.entries(weightChanges).map(([id, weight]) => ({
        id,
        default_weight: weight
      }));

      await api.put('/criteria/weights', {
        weights: weightsPayload
      });

      setSuccess('Bobot kriteria default berhasil diperbarui.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui bobot.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={26} color="var(--primary)" />
          <span>LecRank Admin</span>
        </div>
        <ul className="sidebar-menu">
          <li className={`sidebar-item ${activeTab === 'lecturers' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('lecturers'); clearMessages(); }}>
              <Users size={18} />
              <span>Daftar Dosen</span>
            </a>
          </li>
          <li className={`sidebar-item ${activeTab === 'values' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('values'); clearMessages(); }}>
              <ListOrdered size={18} />
              <span>Matriks Nilai (SPK)</span>
            </a>
          </li>
          <li className={`sidebar-item ${activeTab === 'weights' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('weights'); clearMessages(); }}>
              <Settings size={18} />
              <span>Bobot Kriteria</span>
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info" style={{ marginBottom: '15px' }}>
            <div className="user-avatar" style={{ border: '2px solid var(--accent)' }}>
              <GraduationCap size={20} color="var(--accent)" />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.tenantName || 'Fakultas Admin'}</span>
            </div>
          </div>
          <button onClick={logout} className="sidebar-logout-btn">
            <LogOut size={16} color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Dashboard Admin</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>
              Sistem Pengambil Keputusan - {user?.tenantName || 'Fakultas'}
            </p>
          </div>
          <span className="badge badge-success" style={{ padding: '8px 14px' }}>
            Role: Admin Jurusan
          </span>
        </header>

        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button onClick={clearMessages} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{success}</span>
            <button onClick={clearMessages} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}

        {/* Tab 1: Lecturers List (CRUD) */}
        {activeTab === 'lecturers' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Daftar Dosen Aktif</h2>
              <button className="btn btn-primary" onClick={handleOpenCreateLec}>
                <Plus size={16} /> Tambah Dosen
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nama Dosen</th>
                    <th>NIDN</th>
                    <th>Email</th>
                    <th>Program Studi / Dept</th>
                    <th>Kelengkapan Nilai</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                        Belum ada data dosen terdaftar di fakultas ini.
                      </td>
                    </tr>
                  ) : (
                    lecturers.map((l) => {
                      // Calculate how many criteria values are filled (> 0)
                      const filledCount = criteria.filter(c => l.values && l.values[c.id] > 0).length;
                      const allFilled = filledCount === criteria.length;
                      return (
                        <tr key={l.id}>
                          <td>
                            <img 
                              src={l.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${l.name}`} 
                              alt={l.name} 
                              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: '600' }}>{l.name}</td>
                          <td><code>{l.nidn || '-'}</code></td>
                          <td>{l.email || '-'}</td>
                          <td>{l.department || '-'}</td>
                          <td>
                            {allFilled ? (
                              <span className="badge badge-success">Lengkap ({filledCount}/{criteria.length})</span>
                            ) : (
                              <span className="badge badge-warning">Belum Lengkap ({filledCount}/{criteria.length})</span>
                            )}
                          </td>
                          <td style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className="btn btn-accent" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleOpenInputValues(l)}>
                              Input Nilai
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleOpenEditLec(l)}>
                              <Edit3 size={14} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteLecturer(l.id)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Alternative Matrix (Evaluation values grid) */}
        {activeTab === 'values' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2>Matriks Nilai Kinerja Dosen</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Berikut adalah matriks alternatif (dosen) beserta nilai performansi untuk setiap kriteria SPK (C1 - C5).
              </p>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Dosen</th>
                    <th>Program Studi</th>
                    {criteria.map((c) => (
                      <th key={c.id} style={{ textAlign: 'center' }}>
                        {c.code} ({c.name})
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Type: {c.type}
                        </div>
                      </th>
                    ))}
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturers.length === 0 ? (
                    <tr>
                      <td colSpan={criteria.length + 3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                        Belum ada data dosen.
                      </td>
                    </tr>
                  ) : (
                    lecturers.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: '600' }}>{l.name}</td>
                        <td>{l.department || '-'}</td>
                        {criteria.map((c) => {
                          const val = l.values && l.values[c.id] !== undefined ? l.values[c.id] : 0;
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                              {val === 0 ? (
                                <span style={{ color: 'var(--danger)', fontWeight: 'normal' }}>0.00</span>
                              ) : (
                                <span>{val}</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleOpenInputValues(l)}
                          >
                            Update Nilai
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent)' }}>Keterangan Kriteria Dosen Terbaik:</div>
              <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
                <li><strong>C1 - Lama Mengabdi (Benefit):</strong> Total masa mengajar dosen dalam tahun (misal: 10). Semakin tinggi semakin bagus.</li>
                <li><strong>C2 - Cara Mengajar (Benefit):</strong> Rata-rata kepuasan mahasiswa dalam skala 1 - 100. Semakin tinggi semakin bagus.</li>
                <li><strong>C3 - Ketepatan Waktu Hadir (Benefit):</strong> Persentase kehadiran mengajar tepat waktu dalam skala 1 - 100. Semakin tinggi semakin bagus.</li>
                <li><strong>C4 - Tingkat Keramahan (Benefit):</strong> Skor penilaian keramahan dosen oleh mahasiswa dalam skala 1 - 5. Semakin tinggi semakin bagus.</li>
                <li><strong>C5 - Pemberian Tugas (Cost):</strong> Frekuensi/beban pemberian tugas per semester dalam skala 1 - 10. <strong>Semakin rendah nilainya semakin bagus bagi mahasiswa.</strong></li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Default Weights configuration */}
        {activeTab === 'weights' && (
          <div className="glass-panel" style={{ padding: '30px', maxWidth: '650px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2>Bobot Kriteria Pengambilan Keputusan</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Atur bobot default kriteria SPK untuk pemilihan dosen terbaik. **Total bobot harus sama dengan 100%**.
              </p>
            </div>

            <form onSubmit={handleSaveWeights}>
              {criteria.map((c) => (
                <div className="form-group" key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ minWidth: '80px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.9rem' }}>{c.code}</span>
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: '600' }}>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipe: {c.type === 'benefit' ? 'Benefit (Semakin tinggi semakin bagus)' : 'Cost (Semakin rendah semakin bagus)'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      style={{ width: '80px', textAlign: 'center', padding: '8px' }}
                      min="0"
                      max="100"
                      value={weightChanges[c.id] || 0}
                      onChange={(e) => setWeightChanges({ ...weightChanges, [c.id]: Number(e.target.value) })}
                      required
                    />
                    <span style={{ fontWeight: 'bold' }}>%</span>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Total Bobot Terinput: </span>
                  <strong style={{ fontSize: '1.2rem', color: Object.values(weightChanges).reduce((sum, w) => sum + Number(w), 0) === 100 ? 'var(--accent)' : 'var(--danger)' }}>
                    {Object.values(weightChanges).reduce((sum, w) => sum + Number(w), 0)}%
                  </strong>
                </div>
                <button type="submit" className="btn btn-accent">
                  <Save size={16} /> Simpan Konfigurasi Bobot
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lecturer Form Modal */}
        {showLecModal && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content">
              <div className="modal-header">
                <h2>{isEditingLec ? 'Edit Profil Dosen' : 'Tambah Dosen Baru'}</h2>
                <button onClick={() => setShowLecModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleSaveLecturer}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nama Dosen (Lengkap & Gelar)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Dr. Ir. Budi Santoso, M.T."
                      value={lecName}
                      onChange={(e) => setLecName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIDN (Nomor Induk Dosen Nasional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 0412037501"
                      value={lecNidn}
                      onChange={(e) => setLecNidn(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Dosen</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="e.g. budi.santoso@university.ac.id"
                      value={lecEmail}
                      onChange={(e) => setLecEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Program Studi</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Teknik Informatika"
                      value={lecDepartment}
                      onChange={(e) => setLecDepartment(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link Foto/Avatar URL (Opsional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Masukkan link gambar"
                      value={lecAvatar}
                      onChange={(e) => setLecAvatar(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLecModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">Simpan Profil</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Criteria Values Input Modal */}
        {showValueModal && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content">
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: '1.3rem' }}>Input Evaluasi Kriteria</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>Dosen: {currentLec?.name}</p>
                </div>
                <button onClick={() => setShowValueModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleSaveValues}>
                <div className="modal-body">
                  {criteria.map((c) => {
                    return (
                      <div className="form-group" key={c.id}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{c.code} - {c.name}</span>
                          <span className="badge badge-primary">{c.type}</span>
                        </label>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <input 
                            type="number"
                            step="any"
                            min="0"
                            className="form-control" 
                            value={inputScores[c.id] || 0}
                            onChange={(e) => setInputScores({ ...inputScores, [c.id]: Number(e.target.value) })}
                            required
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '150px' }}>
                            {c.code === 'C1' && 'Tahun mengabdi'}
                            {c.code === 'C2' && 'Skor evaluasi (1-100)'}
                            {c.code === 'C3' && 'Persentase hadir (1-100)'}
                            {c.code === 'C4' && 'Skor ramah (1-5)'}
                            {c.code === 'C5' && 'Jumlah tugas (1-10)'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {c.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowValueModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-accent">
                    <Check size={16} /> Simpan Nilai Evaluasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
