import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit3, 
  Award,
  ShieldCheck
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'tenants' | 'users'>('stats');
  const [stats, setStats] = useState({ tenants: 0, users: 0, lecturers: 0, requests: 0 });
  const [tenants, setTenants] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // Modals state
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState('');
  
  // Tenant Form
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  
  // User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'tenant_admin' | 'super_admin' | 'student'>('tenant_admin');
  const [newUserTenantId, setNewUserTenantId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      if (activeTab === 'stats') {
        const statsData = await api.get('/system-stats');
        setStats(statsData);
      } else if (activeTab === 'tenants') {
        const tenantsData = await api.get('/tenants');
        setTenants(tenantsData);
      } else if (activeTab === 'users') {
        const usersData = await api.get('/users');
        const tenantsData = await api.get('/tenants');
        setUsersList(usersData);
        setTenants(tenantsData);
        if (tenantsData.length > 0) {
          setNewUserTenantId(tenantsData[0].id);
        }
      }
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

  // Tenant Actions
  const handleOpenCreateTenant = () => {
    clearMessages();
    setIsEditingTenant(false);
    setTenantName('');
    setTenantSlug('');
    setTenantEmail('');
    setTenantPhone('');
    setTenantAddress('');
    setShowTenantModal(true);
  };

  const handleOpenEditTenant = (t: any) => {
    clearMessages();
    setIsEditingTenant(true);
    setCurrentTenantId(t.id);
    setTenantName(t.name);
    setTenantSlug(t.slug);
    setTenantEmail(t.email || '');
    setTenantPhone(t.phone || '');
    setTenantAddress(t.address || '');
    setShowTenantModal(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantSlug) {
      setError('Nama dan Slug Fakultas/Jurusan wajib diisi.');
      return;
    }
    
    try {
      const payload = {
        name: tenantName,
        slug: tenantSlug,
        email: tenantEmail,
        phone: tenantPhone,
        address: tenantAddress
      };

      if (isEditingTenant) {
        await api.put(`/tenants/${currentTenantId}`, payload);
        setSuccess('Fakultas/Jurusan berhasil diperbarui.');
      } else {
        await api.post('/tenants', payload);
        setSuccess('Fakultas/Jurusan baru berhasil dibuat.');
      }

      setShowTenantModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data.');
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus Fakultas/Jurusan ini? Semua data dosen dan pengguna di dalamnya akan terhapus.')) return;
    try {
      await api.delete(`/tenants/${id}`);
      setSuccess('Fakultas/Jurusan berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus data.');
    }
  };

  // User Actions
  const handleOpenCreateUser = () => {
    clearMessages();
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('tenant_admin');
    if (tenants.length > 0) {
      setNewUserTenantId(tenants[0].id);
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole) {
      setError('Semua kolom wajib diisi.');
      return;
    }

    try {
      await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        tenantId: newUserRole === 'super_admin' ? null : newUserTenantId
      });

      setSuccess('User baru berhasil didaftarkan.');
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat user baru.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccess('User berhasil dihapus.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus user.');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ShieldCheck size={26} color="var(--primary)" />
          <span>LecRank SaaS</span>
        </div>
        <ul className="sidebar-menu">
          <li className={`sidebar-item ${activeTab === 'stats' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('stats'); clearMessages(); }}>
              <LayoutDashboard size={18} />
              <span>Statistik Sistem</span>
            </a>
          </li>
          <li className={`sidebar-item ${activeTab === 'tenants' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('tenants'); clearMessages(); }}>
              <Building2 size={18} />
              <span>Fakultas / Jurusan</span>
            </a>
          </li>
          <li className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}>
            <a onClick={() => { setActiveTab('users'); clearMessages(); }}>
              <Users size={18} />
              <span>Manajemen User</span>
            </a>
          </li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info" style={{ marginBottom: '15px' }}>
            <div className="user-avatar">
              <ShieldCheck size={20} color="var(--primary)" />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">Super Admin</span>
            </div>
          </div>
          <button onClick={logout} className="sidebar-logout-btn">
            <LogOut size={16} color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Super Admin Dashboard</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Portal Administrasi Global Universitas</p>
          </div>
          <span className="badge badge-primary" style={{ padding: '8px 14px' }}>
            Role: Super Admin
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

        {/* Tab 1: Stats */}
        {activeTab === 'stats' && (
          <div>
            <div className="grid-cols-4">
              <div className="glass-panel stat-card">
                <div className="stat-icon">
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="stat-label">Fakultas / Jurusan</div>
                  <div className="stat-number">{stats.tenants}</div>
                </div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-icon green">
                  <Users size={24} />
                </div>
                <div>
                  <div className="stat-label">Pengguna Sistem</div>
                  <div className="stat-number">{stats.users}</div>
                </div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-icon orange">
                  <Award size={24} />
                </div>
                <div>
                  <div className="stat-label">Total Dosen</div>
                  <div className="stat-number">{stats.lecturers}</div>
                </div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', borderColor: 'rgba(14, 165, 233, 0.2)', color: 'var(--info)' }}>
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <div className="stat-label">Pencarian SPK</div>
                  <div className="stat-number">{stats.requests}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '30px' }}>
              <h2 style={{ marginBottom: '15px' }}>Selamat Datang, {user?.name}!</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Sebagai Super Admin, Anda memiliki hak penuh untuk mengelola struktur data dasar sistem rekomendasi LecRank.
                Anda dapat menambahkan Fakultas atau Jurusan baru (yang bertindak sebagai Tenant), mengkonfigurasi akun admin masing-masing fakultas,
                serta melihat analisis penggunaan sistem di seluruh universitas.
              </p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('tenants')}>
                  <Building2 size={16} /> Kelola Fakultas / Jurusan
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('users')}>
                  <Users size={16} /> Kelola User Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tenants */}
        {activeTab === 'tenants' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Daftar Fakultas / Jurusan</h2>
              <button className="btn btn-primary" onClick={handleOpenCreateTenant}>
                <Plus size={16} /> Tambah Fakultas
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Fakultas/Jurusan</th>
                    <th>Slug</th>
                    <th>Email</th>
                    <th>Telepon</th>
                    <th>Alamat</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                        Belum ada data fakultas/jurusan. Silakan tambahkan baru.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: '600' }}>{t.name}</td>
                        <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{t.slug}</code></td>
                        <td>{t.email || '-'}</td>
                        <td>{t.phone || '-'}</td>
                        <td>{t.address || '-'}</td>
                        <td>
                          <span className="badge badge-success">Aktif</span>
                        </td>
                        <td style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleOpenEditTenant(t)}>
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => handleDeleteTenant(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Users */}
        {activeTab === 'users' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Daftar Akun Pengguna</h2>
              <button className="btn btn-primary" onClick={handleOpenCreateUser}>
                <Plus size={16} /> Buat User Baru
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Lengkap</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Fakultas / Jurusan</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Belum ada data user.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600' }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.role === 'super_admin' && <span className="badge badge-primary">Super Admin</span>}
                          {u.role === 'tenant_admin' && <span className="badge badge-warning">Admin Jurusan</span>}
                          {u.role === 'student' && <span className="badge badge-success">Mahasiswa</span>}
                        </td>
                        <td>{u.tenant_name || <em style={{ color: 'var(--text-muted)' }}>Global (Semua)</em>}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px' }} 
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user?.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tenant Form Modal */}
        {showTenantModal && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content">
              <div className="modal-header">
                <h2>{isEditingTenant ? 'Edit Fakultas/Jurusan' : 'Tambah Fakultas/Jurusan Baru'}</h2>
                <button onClick={() => setShowTenantModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleSaveTenant}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nama Fakultas / Jurusan</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Fakultas Teknologi Informasi"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slug URL (Kode Unik)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. fti"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value)}
                      required 
                      disabled={isEditingTenant}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Kontak</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="e.g. fti@university.ac.id"
                      value={tenantEmail}
                      onChange={(e) => setTenantEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telepon Kantor</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 021-778899"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alamat Kantor/Gedung</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      placeholder="e.g. Gedung A, Kampus Utama..."
                      value={tenantAddress}
                      onChange={(e) => setTenantAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTenantModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">Simpan Data</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Form Modal */}
        {showUserModal && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content">
              <div className="modal-header">
                <h2>Buat User Akun Baru</h2>
                <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Masukkan nama lengkap user"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Pengguna</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="e.g. admin.jurusan@lecrank.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password Akun</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Minimal 6 karakter"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pilih Level/Role</label>
                    <select 
                      className="form-control"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      required
                      style={{ appearance: 'auto' }}
                    >
                      <option value="tenant_admin">Admin Jurusan / Fakultas</option>
                      <option value="super_admin">Super Admin Universitas</option>
                      <option value="student">Mahasiswa</option>
                    </select>
                  </div>
                  {newUserRole !== 'super_admin' && (
                    <div className="form-group">
                      <label className="form-label">Pilih Fakultas / Jurusan Terkait</label>
                      <select 
                        className="form-control"
                        value={newUserTenantId}
                        onChange={(e) => setNewUserTenantId(e.target.value)}
                        required
                        style={{ appearance: 'auto' }}
                      >
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">Daftarkan Akun</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
