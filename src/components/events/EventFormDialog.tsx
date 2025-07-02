
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

const EVENT_TYPES = [
  { value: 'Wedding', label: 'Wedding', color: 'bg-red-100 text-red-800' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding', color: 'bg-pink-100 text-pink-800' },
  { value: 'Engagement', label: 'Engagement', color: 'bg-purple-100 text-purple-800' },
  { value: 'Birthday', label: 'Birthday', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Corporate', label: 'Corporate', color: 'bg-blue-100 text-blue-800' },
  { value: 'Fashion', label: 'Fashion', color: 'bg-green-100 text-green-800' },
  { value: 'Portfolio', label: 'Portfolio', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'Other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const STORAGE_DISKS = [
  { value: 'Disk-A', label: 'Disk A', color: 'bg-red-100 text-red-800' },
  { value: 'Disk-B', label: 'Disk B', color: 'bg-blue-100 text-blue-800' },
  { value: 'Disk-C', label: 'Disk C', color: 'bg-green-100 text-green-800' },
  { value: 'Disk-D', label: 'Disk D', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Disk-E', label: 'Disk E', color: 'bg-purple-100 text-purple-800' },
];

const EventFormDialog = ({ open, onOpenChange, onEventCreated }: EventFormDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [photographers, setPhotographers] = useState<Staff[]>([]);
  const [videographers, setVideographers] = useState<Staff[]>([]);
  const [editors, setEditors] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    event_type: '',
    event_date: '',
    venue: '',
    description: '',
    total_amount: '',
    advance_amount: '',
    photographer_id: '',
    videographer_id: '',
    editor_id: '',
    storage_disk: '',
    storage_size: ''
  });

  useEffect(() => {
    if (open) {
      loadClients();
      loadStaff();
    }
  }, [open]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('firm_id', profile?.firm_id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('firm_id', profile?.firm_id)
        .in('role', ['Photographer', 'Videographer', 'Editor']);

      if (error) throw error;
      
      const staff = data || [];
      setPhotographers(staff.filter(s => s.role === 'Photographer'));
      setVideographers(staff.filter(s => s.role === 'Videographer'));
      setEditors(staff.filter(s => s.role === 'Editor'));
    } catch (error: any) {
      toast({
        title: "Error loading staff",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.client_id || !formData.event_type || !formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const totalAmount = parseFloat(formData.total_amount) || 0;
      const advanceAmount = parseFloat(formData.advance_amount) || 0;
      const balanceAmount = totalAmount - advanceAmount;

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          firm_id: profile?.firm_id,
          title: formData.title,
          client_id: formData.client_id,
          event_type: formData.event_type,
          event_date: formData.event_date,
          venue: formData.venue,
          description: formData.description,
          total_amount: totalAmount,
          advance_amount: advanceAmount,
          balance_amount: balanceAmount,
          photographer_id: formData.photographer_id || null,
          videographer_id: formData.videographer_id || null,
          created_by: profile?.id,
          status: 'Confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial payment record if advance amount is provided
      if (advanceAmount > 0) {
        await supabase
          .from('payments')
          .insert({
            firm_id: profile?.firm_id,
            event_id: event.id,
            amount: advanceAmount,
            payment_method: 'Cash',
            payment_date: new Date().toISOString().split('T')[0],
            created_by: profile?.id,
            notes: 'Initial advance payment'
          });
      }

      toast({
        title: "Event created successfully!",
        description: `${formData.title} has been scheduled`,
      });

      resetForm();
      onOpenChange(false);
      onEventCreated();
    } catch (error: any) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      client_id: '',
      event_type: '',
      event_date: '',
      venue: '',
      description: '',
      total_amount: '',
      advance_amount: '',
      photographer_id: '',
      videographer_id: '',
      editor_id: '',
      storage_disk: '',
      storage_size: ''
    });
  };

  const calculateBalance = () => {
    const total = parseFloat(formData.total_amount) || 0;
    const advance = parseFloat(formData.advance_amount) || 0;
    return total - advance;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Schedule a new photography event with all the details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${type.color}`}>
                          {type.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Date */}
            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            {/* Venue */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="Enter event venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              />
            </div>

            {/* Financial Details */}
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Bill Amount</Label>
              <Input
                id="total_amount"
                type="number"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance_amount">Credit/Advance Amount</Label>
              <Input
                id="advance_amount"
                type="number"
                placeholder="0.00"
                value={formData.advance_amount}
                onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
              />
            </div>

            {/* Balance Amount Display */}
            {(formData.total_amount || formData.advance_amount) && (
              <div className="md:col-span-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Still Amount: ₹{calculateBalance().toFixed(2)}
                </p>
              </div>
            )}

            {/* Staff Assignments */}
            <div className="space-y-2">
              <Label htmlFor="photographer">Photographer</Label>
              <Select value={formData.photographer_id} onValueChange={(value) => setFormData({ ...formData, photographer_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select photographer" />
                </SelectTrigger>
                <SelectContent>
                  {photographers.map((photographer) => (
                    <SelectItem key={photographer.id} value={photographer.id}>
                      {photographer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videographer">Videographer</Label>
              <Select value={formData.videographer_id} onValueChange={(value) => setFormData({ ...formData, videographer_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select videographer" />
                </SelectTrigger>
                <SelectContent>
                  {videographers.map((videographer) => (
                    <SelectItem key={videographer.id} value={videographer.id}>
                      {videographer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Storage Management */}
            <div className="space-y-2">
              <Label htmlFor="storage_disk">Storage Disk</Label>
              <Select value={formData.storage_disk} onValueChange={(value) => setFormData({ ...formData, storage_disk: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select storage disk" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_DISKS.map((disk) => (
                    <SelectItem key={disk.value} value={disk.value}>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${disk.color}`}>
                          {disk.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_size">Storage Size (GB)</Label>
              <Input
                id="storage_size"
                type="number"
                placeholder="Storage size in GB"
                value={formData.storage_size}
                onChange={(e) => setFormData({ ...formData, storage_size: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional event details"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventFormDialog;
