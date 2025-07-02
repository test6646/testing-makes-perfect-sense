
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import TopNavbar from '@/components/layout/TopNavbar';
import PaymentInvoiceCard from '@/components/payments/PaymentInvoiceCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Receipt } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  event_date: string;
  venue?: string;
  total_amount?: number;
  advance_amount?: number;
  balance_amount?: number;
  status: string;
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

const Payments = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

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
    if (!profile?.firm_id) {
      console.log('No firm_id available, skipping payments load');
      return;
    }

    try {
      setLoadingEvents(true);
      console.log('Loading events for payments for firm:', profile.firm_id);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone),
          photographer:profiles!events_photographer_id_fkey(full_name),
          videographer:profiles!events_videographer_id_fkey(full_name)
        `)
        .eq('firm_id', profile.firm_id)
        .not('total_amount', 'is', null)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error loading events for payments:', error);
        throw error;
      }
      
      console.log('Loaded events for payments:', data?.length);
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error in loadEvents for payments:', error);
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const handlePaymentRecord = () => {
    toast({
      title: "Payment Recording",
      description: "Payment recording feature will be implemented soon",
    });
  };

  const handleSendInvoice = () => {
    toast({
      title: "Send Invoice",
      description: "Invoice sending feature will be implemented soon",
    });
  };

  const handleDownloadInvoice = () => {
    toast({
      title: "Download Invoice",
      description: "PDF download feature will be implemented soon",
    });
  };

  if (loading) {
    return (
      <TopNavbar>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payments & Invoices</h1>
              <p className="text-muted-foreground">Track payments and manage invoices</p>
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

  if (!profile?.firm_id) {
    return (
      <TopNavbar>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Receipt className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">No Firm Associated</h1>
          <p className="text-muted-foreground mb-6">
            You need to be associated with a firm to manage payments. Please contact your administrator or create a firm.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
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
            <h1 className="text-3xl font-bold tracking-tight">Payments & Invoices</h1>
            <p className="text-muted-foreground">Track payments, send invoices, and manage financial records</p>
          </div>
        </div>

        {/* Loading State */}
        {loadingEvents && (
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
        )}

        {/* Payment Cards */}
        {!loadingEvents && events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Payment Records Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Payment invoices will appear here automatically when you create events with financial details.
              </p>
              <Button onClick={() => navigate('/events')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Create Event with Payment
              </Button>
            </CardContent>
          </Card>
        ) : !loadingEvents ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <PaymentInvoiceCard
                key={event.id}
                event={event}
                onPaymentRecord={handlePaymentRecord}
                onSendInvoice={handleSendInvoice}
                onDownloadInvoice={handleDownloadInvoice}
              />
            ))}
          </div>
        ) : null}
      </div>
    </TopNavbar>
  );
};

export default Payments;
