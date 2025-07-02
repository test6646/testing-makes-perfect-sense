
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '@/components/layout/TopNavbar';
import FirmCreationDialog from '@/components/FirmCreationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Plus,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showFirmDialog, setShowFirmDialog] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (profile?.firm_id) {
      loadDashboardStats();
    }
  }, [user, loading, profile, navigate]);

  const loadDashboardStats = async () => {
    if (!profile?.firm_id) return;

    try {
      // Load events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', profile.firm_id);

      // Load clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', profile.firm_id);

      // Load revenue data
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('firm_id', profile.firm_id);

      // Load pending payments
      const { data: events } = await supabase
        .from('events')
        .select('balance_amount')
        .eq('firm_id', profile.firm_id)
        .gt('balance_amount', 0);

      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const pendingPayments = events?.reduce((sum, event) => sum + (event.balance_amount || 0), 0) || 0;

      setStats({
        totalEvents: eventsCount || 0,
        totalClients: clientsCount || 0,
        totalRevenue,
        pendingPayments
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  if (loading) {
    return (
      <TopNavbar>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TopNavbar>
    );
  }

  if (!profile?.firm_id) {
    return (
      <TopNavbar>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to #Prit Photo!</h1>
          <p className="text-muted-foreground mb-6">
            To get started, you need to create or join a photography firm. Create your firm to start managing your photography business.
          </p>
          <Button onClick={() => setShowFirmDialog(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Your Firm
          </Button>
        </div>

        <FirmCreationDialog
          open={showFirmDialog}
          onOpenChange={setShowFirmDialog}
          onFirmCreated={() => {
            // Reload the page to refresh profile data
            window.location.reload();
          }}
        />
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your photography business.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Events scheduled and completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                Active clients in your database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total payments received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{stats.pendingPayments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Outstanding balances
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/events')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Manage Events</span>
              </CardTitle>
              <CardDescription>
                Create, edit, and track your photography events
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clients')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Manage Clients</span>
              </CardTitle>
              <CardDescription>
                Add and organize your client database
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/payments')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Track Payments</span>
              </CardTitle>
              <CardDescription>
                Monitor invoices and payment status
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Google Sheets Integration Info */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <FileSpreadsheet className="h-5 w-5" />
              <span>Google Sheets Integration</span>
            </CardTitle>
            <CardDescription className="text-green-700">
              Your firm data is automatically synchronized with Google Spreadsheets for enhanced data management and backup.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </TopNavbar>
  );
};

export default Dashboard;
