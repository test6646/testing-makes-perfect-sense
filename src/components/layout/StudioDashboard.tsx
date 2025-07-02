import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Profile, DashboardStats, Event, Task, Notification } from '@/types/studio';
import { Calendar, Camera, Users, TrendingUp, Bell, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

const StudioDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Load dashboard stats
        await loadStats(profileData.firm_id);
        
        // Load recent events
        await loadRecentEvents(profileData.firm_id);
        
        // Load pending tasks
        await loadPendingTasks(profileData.firm_id);
        
        // Load notifications
        await loadNotifications(profileData.id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (firmId: string) => {
    const { data: events } = await supabase
      .from('events')
      .select('total_amount, advance_amount, status')
      .eq('firm_id', firmId);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('firm_id', firmId);

    if (events && expenses && tasks) {
      const totalRevenue = events.reduce((sum, event) => sum + (event.advance_amount || 0), 0);
      const pendingAmount = events
        .filter(e => e.status !== 'Delivered' && e.status !== 'Cancelled')
        .reduce((sum, event) => sum + ((event.total_amount || 0) - (event.advance_amount || 0)), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const activeEvents = events.filter(e => e.status !== 'Delivered' && e.status !== 'Cancelled').length;
      const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
      const completedEvents = events.filter(e => e.status === 'Delivered').length;

      setStats({
        totalRevenue,
        pendingAmount,
        totalExpenses,
        activeEvents,
        pendingTasks,
        completedEvents,
        monthlyRevenue: totalRevenue, // Simplified for now
        monthlyExpenses: totalExpenses // Simplified for now
      });
    }
  };

  const loadRecentEvents = async (firmId: string) => {
    const { data } = await supabase
      .from('events')
      .select('*, client:clients(*)')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setRecentEvents(data);
  };

  const loadPendingTasks = async (firmId: string) => {
    const { data } = await supabase
      .from('tasks')
      .select('*, event:events(title)')
      .eq('firm_id', firmId)
      .eq('status', 'Pending')
      .order('due_date', { ascending: true })
      .limit(5);

    if (data) setPendingTasks(data as any);
  };

  const loadNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setNotifications(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-primary text-primary-foreground';
      case 'Shooting': return 'bg-info text-info-foreground';
      case 'Editing': return 'bg-warning text-warning-foreground';
      case 'Delivered': return 'bg-success text-success-foreground';
      case 'Cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading your studio dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please complete your profile setup</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Studio Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                {profile.role}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{stats?.pendingAmount?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.activeEvents || 0} active events</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/5 to-info/10 border-info/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Camera className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{stats?.activeEvents || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.pendingTasks || 0} pending tasks</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats?.completedEvents || 0}</div>
              <p className="text-xs text-muted-foreground">Events delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Events
              </CardTitle>
              <CardDescription>Latest photography projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.client?.name} • {new Date(event.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent events</p>
              )}
              <Button variant="outline" className="w-full">
                View All Events
              </Button>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pending Tasks
              </CardTitle>
              <CardDescription>Tasks requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.event?.title} • Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {task.task_type}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No pending tasks</p>
              )}
              <Button variant="outline" className="w-full">
                View All Tasks
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <Button className="h-20 flex-col space-y-2">
                <Camera className="h-6 w-6" />
                <span>New Event</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Users className="h-6 w-6" />
                <span>Add Client</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <DollarSign className="h-6 w-6" />
                <span>Record Payment</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Bell className="h-6 w-6" />
                <span>Send Invoice</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudioDashboard;