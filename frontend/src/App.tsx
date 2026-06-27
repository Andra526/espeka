import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { TenantAdminDashboard } from './pages/TenantAdminDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { RecommendationResult } from './pages/RecommendationResult';
import { GraduationCap } from 'lucide-react';

const RouterComponent: React.FC = () => {
  const { user, loading } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  // Custom client-side navigation
  const navigate = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setPath(newPath);
  };

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fullscreen loader on initial check
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '15px' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Memuat data sesi LecRank...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- UNAUTHENTICATED ROUTES ---
  if (!user) {
    if (path === '/register') {
      return <Register navigate={navigate} />;
    }
    // Fallback to login for any other path
    return <Login navigate={navigate} />;
  }

  // --- ROLE-BASED DASHBOARDS ---
  if (user.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (user.role === 'tenant_admin') {
    return <TenantAdminDashboard />;
  }

  // --- STUDENT ROUTES ---
  if (user.role === 'student') {
    // Match path pattern: /recommendations/:id/result
    const resultMatch = path.match(/^\/recommendations\/([^\/]+)\/result$/);
    if (resultMatch) {
      const requestId = resultMatch[1];
      return <RecommendationResult requestId={requestId} navigate={navigate} />;
    }

    // Default student dashboard
    return <StudentDashboard navigate={navigate} />;
  }

  // Fallback default
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Kesalahan Hak Akses</h2>
      <p style={{ color: 'var(--text-muted)' }}>Role Anda ({user.role}) tidak dikenali oleh sistem.</p>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <RouterComponent />
    </AuthProvider>
  );
}

export default App;
