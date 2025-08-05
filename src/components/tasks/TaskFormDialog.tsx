import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/integrations/supabase/client"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { InlineDatePicker } from "@/components/ui/inline-date-picker"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { Loader2, MessageCircle, AlertCircle } from "lucide-react"
import { Task } from "@/types/studio";
import { useTaskService } from "@/hooks/useTaskService";
import { Alert, AlertDescription } from "@/components/ui/alert";




const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  assigned_to: z.string().optional(),
  event_id: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  task_type: z.enum(["Photo Editing", "Video Editing", "Other"]).optional(),
  amount: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      return /^\d+(\.\d{1,2})?$/.test(val);
    }, "Amount must contain only digits and optional decimal point"),
  description: z.string().optional(),
});

interface SimpleEvent {
  id: string;
  title: string;
  event_type: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
  is_freelancer?: boolean;
}

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingTask?: Task | null;
  events: SimpleEvent[];
  staffMembers: StaffMember[];
}

export const TaskFormDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editingTask, 
  events, 
  staffMembers 
}: TaskFormDialogProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const actualFirmId = profile?.current_firm_id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptimisticUpdate, setShowOptimisticUpdate] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected');
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);
  const [isCheckingWhatsApp, setIsCheckingWhatsApp] = useState(false);

  const { createTask, updateTask } = useTaskService(actualFirmId, profile?.id);

  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      assigned_to: "",
      event_id: "",
      priority: "Medium",
      task_type: "Other",
      amount: "",
      due_date: undefined,
      description: "",
    },
  });

  // Reset form when editingTask changes
  useEffect(() => {
    if (editingTask) {
      // Determine the assigned_to value based on whether it's a freelancer or staff
      let assignedToValue = "";
      if (editingTask.assigned_to) {
        assignedToValue = editingTask.assigned_to;
      } else if (editingTask.freelancer_id) {
        assignedToValue = `freelancer_${editingTask.freelancer_id}`;
      }
      
      form.reset({
        title: editingTask.title || "",
        assigned_to: assignedToValue,
        event_id: editingTask.event_id || "",
        priority: editingTask.priority || "Medium",
        task_type: editingTask.task_type || "Other",
        amount: editingTask.amount?.toString() || "",
        due_date: editingTask.due_date ? new Date(editingTask.due_date) : undefined,
        description: editingTask.description || "",
      });
    } else {
      form.reset({
        title: "",
        assigned_to: "",
        event_id: "",
        priority: "Medium",
        task_type: "Other",
        amount: "",
        due_date: undefined,
        description: "",
      });
    }
  }, [editingTask, form]);

  // Check WhatsApp status when dialog opens
  useEffect(() => {
    if (open && actualFirmId) {
      checkWhatsAppStatus();
    }
  }, [open, actualFirmId]);

  const checkWhatsAppStatus = async () => {
    if (!actualFirmId) return;
    
    setIsCheckingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-session-manager', {
        body: { 
          action: 'status',
          firmId: actualFirmId 
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

  const sendWhatsAppNotification = async (assignedStaff: StaffMember, taskTitle: string, description?: string) => {
    if (!assignedStaff.mobile_number || !assignedStaff.is_freelancer) return;

    try {
      const message = `*TASK ASSIGNMENT*

Hello *${assignedStaff.full_name}*,

You are assigned a new *${form.getValues().task_type || 'Other'}* task.

*Title:* ${taskTitle}
*Priority:* ${form.getValues().priority || 'Medium'}
${form.getValues().due_date ? `*Due Date:* ${format(form.getValues().due_date!, 'dd/MM/yyyy')}\n` : ''}${description ? `_Description:_ ${description}\n` : ''}
Thank you for being part of *PRIT PHOTO*`;
      
      // Get user firm ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_firm_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.current_firm_id) throw new Error('No firm selected');

      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: assignedStaff.mobile_number,
          message: message,
          firmId: profile.current_firm_id
        }
      });
      
      if (error) {
        throw new Error('Failed to send WhatsApp message');
      }

      toast({
        title: "Success",
        description: "Task created and WhatsApp notification sent!",
      });
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      toast({
        title: "Task Created",
        description: "Task created successfully, but WhatsApp notification failed to send.",
        variant: "default",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    if (!actualFirmId) {
      toast({
        title: "Error",
        description: "No firm selected. Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    // Check if assigning to freelancer and WhatsApp status
    const assignedStaff = staffMembers.find(staff => 
      staff.is_freelancer ? `freelancer_${staff.id}` === values.assigned_to : staff.id === values.assigned_to
    );

    if (!editingTask && assignedStaff?.is_freelancer && whatsappStatus !== 'connected') {
      setShowWhatsappDialog(true);
      return;
    }

    setIsSubmitting(true);
    setShowOptimisticUpdate(true);
    
    try {
      const taskData = {
        title: values.title,
        description: values.description || null,
        assigned_to: values.assigned_to || null,
        event_id: values.event_id || null,
        due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : null,
        priority: values.priority || null,
        status: "Waiting for Response" as const,
        task_type: values.task_type || null,
        amount: values.amount ? Number(values.amount) : null,
        firm_id: actualFirmId,
        created_by: profile?.id,
      };

      console.log('📝 Task data being submitted:', taskData);

      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        toast({
          title: "Success",
          description: "Task updated successfully!",
        });
      } else {
        await createTask(taskData);
        
        // Send WhatsApp notification if assigning to freelancer and WhatsApp is connected
        if (assignedStaff?.is_freelancer && whatsappStatus === 'connected') {
          await sendWhatsAppNotification(assignedStaff, values.title, values.description);
        } else {
          toast({
            title: "Success", 
            description: "Task created successfully!",
          });
        }
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      console.error('💥 Task operation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowOptimisticUpdate(false);
    }
  };

  const createTaskWithoutNotification = async () => {
    setShowWhatsappDialog(false);
    const values = form.getValues();
    setIsSubmitting(true);
    setShowOptimisticUpdate(true);
    
    try {
      const taskData = {
        title: values.title,
        description: values.description || null,
        assigned_to: values.assigned_to || null,
        event_id: values.event_id || null,
        due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : null,
        priority: values.priority || null,
        status: "Waiting for Response" as const,
        task_type: values.task_type || null,
        amount: values.amount ? Number(values.amount) : null,
        firm_id: actualFirmId,
        created_by: profile?.id,
      };

      await createTask(taskData);
      toast({
        title: "Success", 
        description: "Task created successfully without notification.",
      });

      onSuccess?.();
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      console.error('💥 Task operation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowOptimisticUpdate(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update the task details.' : 'Fill in the task details to create a new task.'}
            </DialogDescription>
          </DialogHeader>

          {/* WhatsApp Status Alert */}
          {!editingTask && staffMembers.some(s => s.is_freelancer) && (
            <Alert className={whatsappStatus === 'connected' ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                {isCheckingWhatsApp ? (
                  "Checking WhatsApp status..."
                ) : whatsappStatus === 'connected' ? (
                  "✅ WhatsApp is connected. Freelancers will receive task notifications."
                ) : (
                  "⚠️ WhatsApp is not connected. Freelancer notifications will not be sent."
                )}
              </AlertDescription>
            </Alert>
          )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem 
                            key={staff.id} 
                            value={staff.is_freelancer ? `freelancer_${staff.id}` : staff.id}
                          >
                            {staff.full_name} ({staff.role}) {staff.is_freelancer ? '🔗' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Related Event</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title} ({event.event_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="task_type"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Task Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Photo Editing">Photo Editing</SelectItem>
                        <SelectItem value="Video Editing">Video Editing</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <InlineDatePicker
                        onSelect={field.onChange}
                        value={field.value}
                        placeholder="Select due date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                     <Input 
                       placeholder="Enter task amount (optional)" 
                       {...field} 
                       onChange={(e) => {
                         const value = e.target.value;
                         if (value === '' || /^\d*\.?\d*$/.test(value)) {
                           field.onChange(e);
                         }
                       }}
                     />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter task description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting || showOptimisticUpdate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingTask ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Not Connected Dialog */}
      <Dialog open={showWhatsappDialog} onOpenChange={setShowWhatsappDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              WhatsApp Not Connected
            </DialogTitle>
            <DialogDescription>
              You're assigning a task to a freelancer, but WhatsApp is not connected for notifications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-amber-500 bg-amber-50">
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                Freelancers don't have dashboard accounts and rely on WhatsApp notifications to know about new tasks.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">What would you like to do?</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Connect WhatsApp first to enable notifications</li>
                <li>• Create the task without notifications (freelancer won't be notified)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowWhatsappDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={createTaskWithoutNotification}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Create Without Notification
            </Button>
            <Button
              onClick={() => {
                setShowWhatsappDialog(false);
                onOpenChange(false);
                // Navigate to WhatsApp linking page
                window.location.href = '/whatsapp';
              }}
              className="w-full sm:w-auto"
            >
              Connect WhatsApp First
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
