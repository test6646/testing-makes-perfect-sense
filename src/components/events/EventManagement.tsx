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
import { Plus, Calendar, MapPin, Camera, Video, Edit, DollarSign, QrCode, Share, Download } from 'lucide-react';
import { Event, Client, EventFormData, EventType, EventStatus } from '@/types/studio';
import PaymentCard from '@/components/payments/PaymentCard';

const EventManagement = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showPaymentCard, setShowPaymentCard] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
    photographer_id: '',
    videographer_id: ''
  });
  const { toast } = useToast();

  const eventTypes: EventType[] = ['Wedding', 'Pre-Wedding', 'Birthday', 'Corporate', 'Product', 'Portrait', 'Other'];

  useEffect(() => {
    if (profile) {
      loadEvents();
      loadClients();
    }
  }, [profile]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(*),
          photographer:profiles!events_photographer_id_fkey(*),
          videographer:profiles!events_videographer_id_fkey(*)
        `)
        .eq('firm_id', profile?.firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', profile?.firm_id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.client_id || !formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Title, client, and event date are required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const eventData = {
        title: formData.title.trim(),
        client_id: formData.client_id,
        event_type: formData.event_type,
        event_date: formData.event_date,
        venue: formData.venue?.trim() || null,
        description: formData.description?.trim() || null,
        total_amount: formData.total_amount || 0,
        photographer_id: formData.photographer_id || null,
        videographer_id: formData.videographer_id || null,
        firm_id: profile?.firm_id,
        created_by: profile?.id
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        
        toast({
          title: "Event updated successfully!",
          description: `${formData.title} has been updated`,
        });
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: "Event created successfully!",
          description: `${formData.title} has been created`,
        });

        // Show payment card for new event
        if (newEvent && formData.total_amount > 0) {
          setSelectedEvent(newEvent);
          setShowPaymentCard(true);
        }
      }

      resetForm();
      setIsDialogOpen(false);
      loadEvents();
    } catch (error: any) {
      toast({
        title: editingEvent ? "Error updating event" : "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      client_id: '',
      event_type: 'Wedding',
      event_date: '',
      venue: '',
      description: '',
      total_amount: 0,
      photographer_id: '',
      videographer_id: ''
    });
    setEditingEvent(null);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      client_id: event.client_id || '',
      event_type: event.event_type,
      event_date: event.event_date,
      venue: event.venue || '',
      description: event.description || '',
      total_amount: event.total_amount || 0,
      photographer_id: event.photographer_id || '',
      videographer_id: event.videographer_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleNewEvent = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handlePaymentClick = (event: Event) => {
    setSelectedEvent(event);
    setShowPaymentCard(true);
  };

  const getStatusColor = (status: EventStatus) => {
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">Manage your photography events</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Manage your photography events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent 
                  ? 'Update event information below.'
                  : 'Create a new photography event. Fill in the details below.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_type">Event Type *</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value: EventType) => setFormData({ ...formData, event_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    placeholder="Enter event venue"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (₹)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    placeholder="Enter total amount"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter event description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
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
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start managing your photography business by creating your first event. 
              Track events from quotation to delivery.
            </p>
            <Button onClick={handleNewEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{event.title}</CardTitle>
                    <CardDescription className="truncate">
                      {event.client?.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.event_date).toLocaleDateString()}</span>
                </div>
                {event.venue && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4" />
                    <span>₹{event.total_amount?.toLocaleString() || 0}</span>
                  </div>
                  {event.total_amount && event.total_amount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePaymentClick(event)}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      Payment
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{event.event_type}</Badge>
                  <span>Advance: ₹{event.advance_amount?.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Card Dialog */}
      {selectedEvent && (
        <PaymentCard
          event={selectedEvent}
          open={showPaymentCard}
          onOpenChange={setShowPaymentCard}
          onPaymentCollected={loadEvents}
        />
      )}
    </div>
  );
};

export default EventManagement;