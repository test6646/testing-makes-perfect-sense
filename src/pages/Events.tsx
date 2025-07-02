
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '@/components/layout/TopNavbar';
import EventFormDialog from '@/components/events/EventFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Camera, 
  Video,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  venue?: string;
  total_amount?: number;
  advance_amount?: number;
  balance_amount?: number;
  status: string;
  created_at: string;
  client?: {
    name: string;
    phone: string;
  };
  photographer?: {
    full_name: string;
  };
  videographer?: {
    full_name: string;
  };
}

const Events = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (profile?.firm_id) {
      loadEvents();
    }
  }, [user, loading, profile, navigate]);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone),
          photographer:profiles!events_photographer_id_fkey(full_name),
          videographer:profiles!events_videographer_id_fkey(full_name)
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
      setLoadingEvents(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      'Wedding': 'bg-red-100 text-red-800',
      'Pre-Wedding': 'bg-pink-100 text-pink-800',
      'Engagement': 'bg-purple-100 text-purple-800',
      'Birthday': 'bg-yellow-100 text-yellow-800',
      'Corporate': 'bg-blue-100 text-blue-800',
      'Fashion': 'bg-green-100 text-green-800',
      'Portfolio': 'bg-indigo-100 text-indigo-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[eventType as keyof typeof colors] || colors.Other;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Confirmed':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading || loadingEvents) {
    return (
      <TopNavbar>
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
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Events</h1>
            <p className="text-muted-foreground">Manage your photography events and assignments</p>
          </div>
          <Button onClick={() => setShowEventDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
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
                Start organizing your photography business by creating your first event. 
                You can assign staff, track payments, and manage all event details.
              </p>
              <Button onClick={() => setShowEventDialog(true)}>
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
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(event.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Details */}
                  <div className="space-y-2">
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
                    {event.client && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{event.client.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Staff Assignment */}
                  {(event.photographer || event.videographer) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">ASSIGNED STAFF</p>
                      <div className="flex flex-wrap gap-2">
                        {event.photographer && (
                          <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            <Camera className="h-3 w-3" />
                            <span>{event.photographer.full_name}</span>
                          </div>
                        )}
                        {event.videographer && (
                          <div className="flex items-center space-x-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                            <Video className="h-3 w-3" />
                            <span>{event.videographer.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  {event.total_amount && (
                    <div className="grid grid-cols-3 gap-2 p-2 bg-muted/50 rounded-md text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-semibold">₹{event.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-semibold text-green-600">₹{(event.advance_amount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-sm font-semibold text-red-600">₹{(event.balance_amount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Event Creation Dialog */}
        <EventFormDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          onEventCreated={loadEvents}
        />
      </div>
    </TopNavbar>
  );
};

export default Events;
