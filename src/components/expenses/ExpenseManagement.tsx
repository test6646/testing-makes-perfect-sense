import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Calendar, DollarSign, Edit, Search, Filter } from 'lucide-react';
import { Expense, Event, ExpenseFormData, ExpenseCategory } from '@/types/studio';

const ExpenseManagement = () => {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'Equipment',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    event_id: ''
  });
  const { toast } = useToast();

  const expenseCategories: ExpenseCategory[] = [
    'Equipment', 'Travel', 'Accommodation', 'Food', 'Marketing', 
    'Software', 'Maintenance', 'Salary', 'Other'
  ];

  useEffect(() => {
    if (profile) {
      loadExpenses();
      loadEvents();
    }
  }, [profile]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          event:events(id, title)
        `)
        .eq('firm_id', profile?.firm_id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading expenses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('firm_id', profile?.firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.amount || formData.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Description and amount are required, and amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const expenseData = {
        category: formData.category,
        amount: formData.amount,
        description: formData.description.trim(),
        expense_date: formData.expense_date,
        event_id: formData.event_id || null,
        firm_id: profile?.firm_id,
        created_by: profile?.id
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        
        toast({
          title: "Expense updated successfully!",
          description: `Expense has been updated`,
        });
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData);

        if (error) throw error;
        
        toast({
          title: "Expense created successfully!",
          description: `₹${formData.amount.toLocaleString()} expense has been recorded`,
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadExpenses();
    } catch (error: any) {
      toast({
        title: editingExpense ? "Error updating expense" : "Error creating expense",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'Equipment',
      amount: 0,
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
      event_id: ''
    });
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      expense_date: expense.expense_date,
      event_id: expense.event_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleNewExpense = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors = {
      Equipment: 'bg-blue-100 text-blue-800',
      Travel: 'bg-green-100 text-green-800',
      Accommodation: 'bg-purple-100 text-purple-800',
      Food: 'bg-orange-100 text-orange-800',
      Marketing: 'bg-pink-100 text-pink-800',
      Software: 'bg-indigo-100 text-indigo-800',
      Maintenance: 'bg-yellow-100 text-yellow-800',
      Salary: 'bg-red-100 text-red-800',
      Other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.Other;
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.event?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Track business expenses and costs</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track business expenses and costs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense 
                  ? 'Update expense information below.'
                  : 'Record a new business expense. Fill in the details below.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: ExpenseCategory) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Expense Date *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event">Related Event (Optional)</Label>
                  <Select
                    value={formData.event_id}
                    onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter expense description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} expenses recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{filteredExpenses
                .filter(expense => new Date(expense.expense_date).getMonth() === new Date().getMonth())
                .reduce((sum, expense) => sum + expense.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current month expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per expense average</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses by description or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Grid */}
      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Expenses Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start tracking your business expenses by recording your first expense. 
              Monitor costs and analyze spending patterns.
            </p>
            <Button onClick={handleNewExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-right">
                      ₹{expense.amount.toLocaleString()}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {expense.event?.title || 'General Expense'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(expense.category)}>
                      {expense.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {expense.description}
                </p>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Recorded: {new Date(expense.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;