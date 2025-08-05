import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus } from '@/types/studio';
import { TASK_STATUSES } from '@/lib/task-status-utils';
import { Loader2, MessageCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface FreelancerTaskStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onStatusChange: () => void;
}

const FreelancerTaskStatusDialog = ({ 
  open, 
  onOpenChange, 
  task, 
  onStatusChange 
}: FreelancerTaskStatusDialogProps) => {
  const [newStatus, setNewStatus] = useState<TaskStatus>('Waiting for Response');
  const [isUpdating, setIsUpdating] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected');
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false);
  const { toast } = useToast();

  const checkWhatsAppStatus = async () => {
    setIsCheckingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-whatsapp-status', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!error && data) {
        setWhatsappStatus(data.status || 'disconnected');
      } else {
        setWhatsappStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappStatus('disconnected');
    } finally {
      setIsCheckingWhatsApp(false);
    }
  };

  const sendStatusUpdateNotification = async (task: Task, newStatus: TaskStatus) => {
    if (!task.freelancer?.full_name) return;

    try {
      // Get freelancer details to get phone number
      const { data: freelancer, error } = await supabase
        .from('freelancers')
        .select('phone, firm_id')
        .eq('id', task.freelancer_id)
        .single();

      if (error || !freelancer?.phone) {
        console.error('Could not get freelancer phone:', error);
        return;
      }

      const statusEmoji = {
        'Pending': '⏳',
        'In Progress': '🔄',
        'Completed': '✅',
        'Under Review': '👀',
        'On Hold': '⏸️',
        'Waiting for Response': '⏰',
        'Accepted': '✅',
        'Declined': '❌'
      };

      const message = `📬 Task Status Update!\n\n📋 Task: ${task.title}\n${statusEmoji[newStatus]} Status: ${newStatus}\n\n💼 Team Management System`;
      
      // Send WhatsApp message via proxy
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            firmId: freelancer.firm_id,
            phone: freelancer.phone,
            message: message
          }
        });
        
        if (error) {
          throw new Error('Failed to send WhatsApp message');
        }
      } catch (messageError) {
        console.error('WhatsApp notification error:', messageError);
      }
    } catch (error) {
      console.error('Failed to send WhatsApp status notification:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!task) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      // Send WhatsApp notification if connected
      if (whatsappStatus === 'connected' && task.freelancer_id) {
        await sendStatusUpdateNotification(task, newStatus);
        toast({
          title: "Success",
          description: "Task status updated and notification sent!",
        });
      } else {
        toast({
          title: "Success",
          description: "Task status updated successfully!",
        });
      }

      onStatusChange();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update task status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Under Review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Under Review':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'On Hold':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Declined':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  // Check WhatsApp status when dialog opens
  useEffect(() => {
    if (open) {
      checkWhatsAppStatus();
      if (task) {
        setNewStatus(task.status);
      }
    }
  }, [open, task]);

  if (!task) return null;

  const isFreelancer = !!task.freelancer_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Update Task Status - {isFreelancer ? 'Freelancer' : 'Staff'} Task
          </DialogTitle>
          <DialogDescription>
            Update the status of "{task.title}" and optionally notify the {isFreelancer ? 'freelancer' : 'staff member'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Status</label>
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <Badge className={getStatusColor(task.status)}>
                {task.status}
              </Badge>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">New Status</label>
            <Select value={newStatus} onValueChange={(value: TaskStatus) => setNewStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {status}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* WhatsApp Notification Status */}
          {isFreelancer && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">WhatsApp Notification:</span>
                {isCheckingWhatsApp ? (
                  <span className="text-muted-foreground">Checking...</span>
                ) : whatsappStatus === 'connected' ? (
                  <span className="text-green-600">✅ Will be sent</span>
                ) : (
                  <span className="text-amber-600">⚠️ Not available</span>
                )}
              </div>
              {whatsappStatus !== 'connected' && !isCheckingWhatsApp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Connect WhatsApp to automatically notify freelancers about status changes.
                </p>
              )}
            </div>
          )}

          {/* Task Details */}
          <div className="space-y-2 p-3 bg-muted/50 border rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Task:</span> {task.title}
            </div>
            <div className="text-sm">
              <span className="font-medium">Assigned to:</span> {
                task.freelancer?.full_name || task.assignee?.full_name || 'Unassigned'
              } {isFreelancer && '(Freelancer)'}
            </div>
            {task.event?.title && (
              <div className="text-sm">
                <span className="font-medium">Event:</span> {task.event.title}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={isUpdating || newStatus === task.status}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FreelancerTaskStatusDialog;