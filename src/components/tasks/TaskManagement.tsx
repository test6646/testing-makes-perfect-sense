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
import { Plus, CheckSquare, Calendar, User, Clock, Edit, Filter, Search } from 'lucide-react';
import { Task, Event, TaskFormData, TaskType, TaskStatus } from '@/types/studio';

const TaskManagement = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    task_type: 'Photography',
    assigned_to: '',
    due_date: '',
    priority: 1
  });
  const { toast } = useToast();

  const taskTypes: TaskType[] = ['Photography', 'Videography', 'Photo Editing', 'Video Editing', 'Delivery', 'Client Meeting', 'Other'];
  const taskStatuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'On Hold'];

  useEffect(() => {
    if (profile) {
      loadTasks();
      loadEvents();
    }
  }, [profile]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          event:events(id, title, client:clients(name)),
          assigned_staff:profiles!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq('firm_id', profile?.firm_id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading tasks",
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
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        task_type: formData.task_type,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        firm_id: profile?.firm_id,
        created_by: profile?.id
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        
        toast({
          title: "Task updated successfully!",
          description: `${formData.title} has been updated`,
        });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(taskData);

        if (error) throw error;
        
        toast({
          title: "Task created successfully!",
          description: `${formData.title} has been created`,
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadTasks();
    } catch (error: any) {
      toast({
        title: editingTask ? "Error updating task" : "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updates: any = { status };
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      
      toast({
        title: "Task status updated",
        description: `Task marked as ${status.toLowerCase()}`,
      });
      
      loadTasks();
    } catch (error: any) {
      toast({
        title: "Error updating task status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'Photography',
      assigned_to: '',
      due_date: '',
      priority: 1
    });
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      task_type: task.task_type,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || '',
      priority: task.priority || 1
    });
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Completed': return 'bg-success text-success-foreground';
      case 'In Progress': return 'bg-info text-info-foreground';
      case 'On Hold': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-destructive text-destructive-foreground';
    if (priority >= 3) return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground">Manage your tasks efficiently</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks efficiently</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask 
                  ? 'Update task information below.'
                  : 'Create a new task. Fill in the details below.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task_type">Task Type *</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(value: TaskType) => setFormData({ ...formData, task_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-5)</Label>
                  <Select
                    value={formData.priority.toString()}
                    onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((priority) => (
                        <SelectItem key={priority} value={priority.toString()}>
                          {priority} - {priority <= 2 ? 'Low' : priority <= 3 ? 'Medium' : 'High'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
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
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {taskStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start organizing your workflow by creating your first task. 
              Track progress from creation to completion.
            </p>
            <Button onClick={handleNewTask}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{task.title}</CardTitle>
                    <CardDescription className="truncate">
                      {task.event?.title}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{task.task_type}</Badge>
                  <Badge className={getPriorityColor(task.priority || 1)}>
                    P{task.priority || 1}
                  </Badge>
                </div>
                
                {task.due_date && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}

                {task.status !== 'Completed' && (
                  <div className="flex space-x-2">
                    {task.status === 'Pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'In Progress')}
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status === 'In Progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'Completed')}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                  {task.completed_at && (
                    <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskManagement;