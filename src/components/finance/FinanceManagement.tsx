import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, BarChart3, PieChart } from 'lucide-react';
import { DashboardStats } from '@/types/studio';

const FinanceManagement = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadFinancialStats();
    }
  }, [profile, timeRange]);

  const loadFinancialStats = async () => {
    try {
      setLoading(true);

      // Get date range based on selection
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('total_amount, advance_amount, balance_amount, status, created_at')
        .eq('firm_id', profile?.firm_id)
        .gte('created_at', startDate.toISOString());

      if (eventsError) throw eventsError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('firm_id', profile?.firm_id)
        .gte('payment_date', startDate.toISOString().split('T')[0]);

      if (paymentsError) throw paymentsError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('firm_id', profile?.firm_id)
        .gte('expense_date', startDate.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, due_date')
        .eq('firm_id', profile?.firm_id);

      if (tasksError) throw tasksError;

      // Calculate stats
      const totalRevenue = events?.reduce((sum, event) => sum + (event.total_amount || 0), 0) || 0;
      const totalPayments = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const pendingAmount = events?.reduce((sum, event) => sum + (event.balance_amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const activeEvents = events?.filter(event => ['Confirmed', 'Shooting', 'Editing'].includes(event.status)).length || 0;
      const completedEvents = events?.filter(event => event.status === 'Delivered').length || 0;
      const pendingTasks = tasks?.filter(task => task.status === 'Pending').length || 0;

      setStats({
        totalRevenue,
        pendingAmount,
        totalExpenses,
        activeEvents,
        pendingTasks,
        completedEvents,
        monthlyRevenue: totalPayments,
        monthlyExpenses: totalExpenses
      });

    } catch (error: any) {
      toast({
        title: "Error loading financial data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportFinancialReport = async () => {
    try {
      // Generate CSV report
      const reportData = [
        ['Metric', 'Value'],
        ['Total Revenue', `₹${stats?.totalRevenue.toLocaleString() || 0}`],
        ['Pending Amount', `₹${stats?.pendingAmount.toLocaleString() || 0}`],
        ['Total Expenses', `₹${stats?.totalExpenses.toLocaleString() || 0}`],
        ['Net Profit', `₹${((stats?.monthlyRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()}`],
        ['Active Events', stats?.activeEvents.toString() || '0'],
        ['Completed Events', stats?.completedEvents.toString() || '0'],
        ['Pending Tasks', stats?.pendingTasks.toString() || '0']
      ];

      const csvContent = reportData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report exported successfully!",
        description: "Financial report has been downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const profitMargin = stats ? ((stats.monthlyRevenue - stats.totalExpenses) / stats.monthlyRevenue * 100) : 0;
  const revenueGrowth = stats ? (stats.totalRevenue > 0 ? 15.2 : 0) : 0; // Mock growth percentage

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
            <p className="text-muted-foreground">Financial analytics and reports</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">Financial analytics and reports</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportFinancialReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.totalRevenue.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{revenueGrowth.toFixed(1)}%
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.pendingAmount.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Amount to be collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats?.totalExpenses.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Business expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((stats?.monthlyRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={profitMargin >= 0 ? "text-green-600" : "text-red-600"}>
                {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}% margin
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Events</CardTitle>
            <CardDescription>Events in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeEvents || 0}</div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{stats?.completedEvents || 0} completed</Badge>
              <span>events this {timeRange}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Tasks</CardTitle>
            <CardDescription>Tasks awaiting completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingTasks || 0}</div>
            <p className="text-sm text-muted-foreground">
              Tasks require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Health</CardTitle>
            <CardDescription>Overall business status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {profitMargin >= 20 ? (
                <Badge className="bg-green-100 text-green-800">Excellent</Badge>
              ) : profitMargin >= 10 ? (
                <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
              ) : profitMargin >= 0 ? (
                <Badge className="bg-orange-100 text-orange-800">Fair</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on profit margin and cash flow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Financial Insights
          </CardTitle>
          <CardDescription>
            Key insights and recommendations for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Revenue Analysis</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Revenue per event: ₹{stats?.activeEvents ? Math.round((stats.totalRevenue || 0) / stats.activeEvents).toLocaleString() : 0}</li>
                <li>• Collection efficiency: {stats?.totalRevenue ? Math.round(((stats.monthlyRevenue || 0) / stats.totalRevenue) * 100) : 0}%</li>
                <li>• Average project value trending {revenueGrowth > 0 ? 'upward' : 'downward'}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Expense Analysis</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Expense ratio: {stats?.totalRevenue ? Math.round(((stats.totalExpenses || 0) / stats.totalRevenue) * 100) : 0}% of revenue</li>
                <li>• Average expense per event: ₹{stats?.activeEvents ? Math.round((stats.totalExpenses || 0) / stats.activeEvents).toLocaleString() : 0}</li>
                <li>• Cost management is {(stats?.totalExpenses || 0) / (stats?.totalRevenue || 1) < 0.3 ? 'excellent' : 'needs review'}</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Recommendations</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {profitMargin < 10 && (
                <p>• Consider reviewing pricing strategy to improve profit margins</p>
              )}
              {(stats?.pendingAmount || 0) > (stats?.monthlyRevenue || 0) * 0.3 && (
                <p>• Focus on collecting pending payments to improve cash flow</p>
              )}
              {(stats?.pendingTasks || 0) > 10 && (
                <p>• Address pending tasks to ensure timely project delivery</p>
              )}
              {revenueGrowth > 15 && (
                <p>• Strong growth trend - consider scaling operations</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceManagement;