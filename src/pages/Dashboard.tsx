
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
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showFirmDialog, setShowFirmDialog] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  const [chartData, setChartData] = useState({
    eventTypes: [],
    monthlyRevenue: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

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
      setLoadingStats(true);
      
      // Load events count and types
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('event_type, total_amount, created_at')
        .eq('firm_id', profile.firm_id);

      if (eventsError) throw eventsError;

      // Load clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', profile.firm_id);

      // Load revenue data
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('firm_id', profile.firm_id);

      // Load pending payments
      const { data: pendingEvents } = await supabase
        .from('events')
        .select('balance_amount')
        .eq('firm_id', profile.firm_id)
        .gt('balance_amount', 0);

      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const pendingPayments = pendingEvents?.reduce((sum, event) => sum + (event.balance_amount || 0), 0) || 0;

      // Process event types for pie chart
      const eventTypeMap = events?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {}) || {};

      const eventTypesData = Object.entries(eventTypeMap).map(([type, count]) => ({
        name: type,
        value: count
      }));

      // Process monthly revenue for bar chart
      const monthlyMap = payments?.reduce((acc, payment) => {
        const month = new Date(payment.created_at).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + payment.amount;
        return acc;
      }, {}) || {};

      const monthlyRevenueData = Object.entries(monthlyMap).map(([month, amount]) => ({
        month,
        amount
      }));

      setStats({
        totalEvents: events?.length || 0,
        totalClients: clientsCount || 0,
        totalRevenue,
        pendingPayments
      });

      setChartData({
        eventTypes: eventTypesData,
        monthlyRevenue: monthlyRevenueData
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFirmCreated = async () => {
    // Refresh profile to get the new firm_id
    await refreshProfile();
    setShowFirmDialog(false);
    // Reload stats after profile refresh
    setTimeout(() => loadDashboardStats(), 1000);
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
          onFirmCreated={handleFirmCreated}
        />
      </TopNavbar>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

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
              <div className="text-2xl font-bold">{loadingStats ? '...' : stats.totalEvents}</div>
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
              <div className="text-2xl font-bold">{loadingStats ? '...' : stats.totalClients}</div>
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
              <div className="text-2xl font-bold">₹{loadingStats ? '...' : stats.totalRevenue.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-orange-600">₹{loadingStats ? '...' : stats.pendingPayments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Outstanding balances
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {!loadingStats && (chartData.eventTypes.length > 0 || chartData.monthlyRevenue.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Event Types Pie Chart */}
            {chartData.eventTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Types Distribution</CardTitle>
                  <CardDescription>Breakdown of events by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.eventTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.eventTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Monthly Revenue Bar Chart */}
            {chartData.monthlyRevenue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                  <CardDescription>Revenue trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.monthlyRevenue}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                      <Legend />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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

        {/* System Status Alert */}
        {loadingStats && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <AlertCircle className="h-5 w-5" />
                <span>Loading Dashboard Data</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Please wait while we fetch your latest business statistics...
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </TopNavbar>
  );
};

export default Dashboard;
