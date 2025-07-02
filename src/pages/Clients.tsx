
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import ClientManagement from '@/components/clients/ClientManagement';

const Clients = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <TopNavbar>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <ClientManagement />
    </TopNavbar>
  );
};

export default Clients;
