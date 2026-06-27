import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Trophy, 
  ArrowLeft, 
  GraduationCap, 
  Table, 
  Percent, 
  Calculator,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface RecommendationResultProps {
  requestId: string;
  navigate: (path: string) => void;
}

export const RecommendationResult: React.FC<RecommendationResultProps> = ({ requestId, navigate }) => {
  const [data, setData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ranking' | 'math'>('ranking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResult = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/recommendations/${requestId}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil hasil rekomendasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [requestId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Menghitung Algoritma SAW...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', padding: '20px' }}>
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '15px' }}>Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>{error || 'Data tidak ditemukan.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/student/dashboard')}>
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { request, weights, sawData } = data;
  const topThree = sawData.ranking.slice(0, 3);
  
  // Reorder top 3 for podium: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], posClass: 'podium-2', label: '2' });
  if (topThree[0]) podiumOrder.push({ ...topThree[0], posClass: 'podium-1', label: '1' });
  if (topThree[2]) podiumOrder.push({ ...topThree[2], posClass: 'podium-3', label: '3' });

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh' }}>
      {/* Sidebar (read-only style for context) */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={26} color="var(--primary)" />
          <span>LecRank</span>
        </div>
        <ul className="sidebar-menu">
          <li className="sidebar-item">
            <a onClick={() => navigate('/student/dashboard')}>
              <Sliders size={18} />
              <span>Kembali</span>
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={() => navigate('/student/dashboard')} className="btn btn-secondary" style={{ width: '100%' }}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button 
              onClick={() => navigate('/student/dashboard')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '12px', fontWeight: '600' }}
            >
              <ArrowLeft size={14} /> Kembali ke Dashboard
            </button>
            <h1>Hasil Rekomendasi Dosen</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>
              Kategori: {request.department} • Catatan: {request.note}
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Dihitung pada:<br />
            <strong style={{ color: 'var(--text-main)' }}>
              {new Date(request.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </strong>
          </span>
        </header>

        {/* Selected Weights Display Panel */}
        <div className="glass-panel" style={{ padding: '20px 30px', marginBottom: '30px', background: 'rgba(99, 102, 241, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: '700', fontSize: '0.9rem' }}>
            <Sliders size={16} color="var(--primary)" /> Preferensi Bobot yang Anda Input:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {sawData.criteria.map((c: any) => (
              <div key={c.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary">{c.code}</span>
                <span>{c.name}: <strong>{c.weightUsed}%</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="tab-header">
          <button 
            className={`tab-btn ${activeSubTab === 'ranking' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('ranking')}
          >
            <Trophy size={16} style={{ marginRight: '6px', display: 'inline' }} /> Ranking Rekomendasi
          </button>
          <button 
            className={`tab-btn ${activeSubTab === 'math' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('math')}
          >
            <Calculator size={16} style={{ marginRight: '6px', display: 'inline' }} /> Langkah Perhitungan SPK (SAW)
          </button>
        </div>

        {/* Tab CONTENT 1: Podium and Ranking List */}
        {activeSubTab === 'ranking' && (
          <div>
            {/* Podium Visual */}
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Podium Dosen Terbaik</h2>
            <div className="podium-container">
              {podiumOrder.map((item) => (
                <div key={item.lecturerId} className="podium-item">
                  <div className="podium-lecturer">
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${item.name.replace(/\s+/g, '')}`}
                      alt={item.name}
                      style={{ width: item.label === '1' ? '65px' : '55px', height: item.label === '1' ? '65px' : '55px', borderRadius: '50%', border: '2px solid var(--primary)', background: 'var(--bg-secondary)', marginBottom: '8px' }}
                    />
                    <div className="podium-name">{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.department}</div>
                    <div className="podium-score">Skor: {item.finalScore}</div>
                  </div>
                  <div className={`podium-pillar ${item.posClass}`}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Complete Ranking Table */}
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '20px' }}>Semua Peringkat Dosen</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th>Foto</th>
                      <th>Nama Dosen</th>
                      <th>Program Studi</th>
                      <th style={{ textAlign: 'center' }}>Skor Akhir (SAW)</th>
                      <th>Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sawData.ranking.map((item: any, idx: number) => {
                      const isTop1 = idx === 0;
                      return (
                        <tr key={item.lecturerId}>
                          <td style={{ textAlign: 'center' }}>
                            {isTop1 ? (
                              <span style={{ display: 'inline-flex', padding: '6px 12px', background: 'rgba(255, 215, 0, 0.2)', border: '1px solid #ffd700', color: '#ffd700', borderRadius: '50%', fontWeight: '800' }}>
                                1
                              </span>
                            ) : (
                              <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>{idx + 1}</span>
                            )}
                          </td>
                          <td>
                            <img 
                              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${item.name.replace(/\s+/g, '')}`}
                              alt={item.name}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: '600' }}>{item.name}</td>
                          <td>{item.department}</td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--accent)', fontSize: '1.05rem' }}>
                            {item.finalScore.toFixed(4)}
                          </td>
                          <td>
                            {isTop1 ? (
                              <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                <CheckCircle2 size={12} /> Rekomendasi Utama
                              </span>
                            ) : (
                              <span className="badge badge-primary">Alternatif</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab CONTENT 2: Mathematical Breakdown */}
        {activeSubTab === 'math' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>Langkah-Langkah Perhitungan SAW (Simple Additive Weighting)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px' }}>
              Metode SAW sering juga dikenal dengan istilah metode penjumlahan terbobot. Konsep dasar metode SAW adalah mencari penjumlahan terbobot dari rating kinerja pada setiap alternatif (dosen) pada semua kriteria.
            </p>

            {/* Step 1: Decision Matrix */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '14px' }}>
                <Table size={18} /> Langkah 1: Matriks Keputusan Awal (X)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Membuat matriks berdasarkan data alternatif (dosen) dan nilai performansinya untuk setiap kriteria.
              </p>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Alternatif (Dosen)</th>
                      {sawData.criteria.map((c: any) => (
                        <th key={c.id} style={{ textAlign: 'center' }}>{c.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sawData.initialMatrix.map((row: any) => (
                      <tr key={row.lecturerId}>
                        <td style={{ fontWeight: '600' }}>{row.name}</td>
                        {sawData.criteria.map((c: any) => (
                          <td key={c.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            {row.values[c.code]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2: Extrema Min/Max */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '14px' }}>
                <Percent size={18} /> Langkah 2: Menentukan Nilai Ekstrem (Max / Min)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Menentukan nilai maksimal (untuk kriteria Benefit) dan minimal (untuk kriteria Cost) dari setiap kriteria di matriks keputusan.
              </p>
              <div className="equation-card">
                {sawData.criteria.map((c: any) => {
                  const type = c.type;
                  const extVal = sawData.minMaxValues[c.code];
                  return (
                    <div key={c.id} style={{ marginBottom: '6px' }}>
                      {type === 'benefit' ? (
                        <span>Max {c.code} ({c.name} - Benefit) = <strong>{extVal}</strong></span>
                      ) : (
                        <span>Min {c.code} ({c.name} - Cost) = <strong>{extVal}</strong></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Normalization Matrix */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '14px' }}>
                <Calculator size={18} /> Langkah 3: Matriks Ternormalisasi (R)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '10px' }}>
                Melakukan normalisasi nilai matriks keputusan awal $X$ ke matriks ternormalisasi $R$ dengan rumus:
              </p>
              <div className="equation-card" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                Benefit: r_ij = x_ij / Max(x_j) <br />
                Cost: r_ij = Min(x_j) / x_ij
              </div>
              <div className="table-container" style={{ marginTop: '15px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Alternatif (Dosen)</th>
                      {sawData.criteria.map((c: any) => (
                        <th key={c.id} style={{ textAlign: 'center' }}>{c.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sawData.normalizedMatrix.map((row: any) => (
                      <tr key={row.lecturerId}>
                        <td style={{ fontWeight: '600' }}>{row.name}</td>
                        {sawData.criteria.map((c: any) => (
                          <td key={c.id} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>
                            {row.values[c.code].toFixed(4)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 4: Weight multiplication and summation */}
            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', color: 'var(--primary)', marginBottom: '14px' }}>
                <Trophy size={18} /> Langkah 4: Mengalikan dengan Bobot (W) & Penjumlahan Akhir (V)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Skor akhir ($V_i$) dihitung dengan mengalikan baris matriks ternormalisasi ($R$) dengan bobot kriteria ($W$), kemudian menjumlahkannya.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sawData.ranking.map((item: any) => {
                  // Find initial matching row for normalized matrix
                  const normRow = sawData.normalizedMatrix.find((r: any) => r.lecturerId === item.lecturerId);
                  const calculations = sawData.criteria.map((c: any) => {
                    const normVal = normRow.values[c.code];
                    const weightDec = c.weightUsed / 100;
                    return `(${normVal.toFixed(2)} × ${weightDec.toFixed(2)})`;
                  }).join(' + ');

                  return (
                    <div key={item.lecturerId} className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px' }}>{item.name}</div>
                      <div className="equation-card" style={{ margin: 0, fontSize: '0.8rem' }}>
                        V_dosen = {calculations} <br />
                        V_dosen = <strong>{item.finalScore.toFixed(4)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
