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
import { Plus, FileText, Calendar, MapPin, DollarSign, Edit, ExternalLink, CheckCircle } from 'lucide-react';
import { Quotation, Client, EventType } from '@/types/studio';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue: string;
  description: string;
  amount: number;
  valid_until: string;
}

const QuotationManagement = () => {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    amount: 0,
    valid_until: ''
  });
  const { toast } = useToast();

  const eventTypes: EventType[] = ['Wedding', 'Pre-Wedding', 'Birthday', 'Corporate', 'Product', 'Portrait', 'Other'];

  useEffect(() => {
    if (profile) {
      loadQuotations();
      loadClients();
    }
  }, [profile]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*),
          event:events(id, title)
        `)
        .eq('firm_id', profile?.firm_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading quotations",
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
    
    if (!formData.title.trim() || !formData.client_id || !formData.event_date || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Title, client, event date, and amount are required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const quotationData = {
        title: formData.title.trim(),
        client_id: formData.client_id,
        event_type: formData.event_type,
        event_date: formData.event_date,
        venue: formData.venue?.trim() || null,
        description: formData.description?.trim() || null,
        amount: formData.amount,
        valid_until: formData.valid_until || null,
        firm_id: profile?.firm_id,
        created_by: profile?.id
      };

      if (editingQuotation) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', editingQuotation.id);

        if (error) throw error;
        
        toast({
          title: "Quotation updated successfully!",
          description: `${formData.title} has been updated`,
        });
      } else {
        const { error } = await supabase
          .from('quotations')
          .insert(quotationData);

        if (error) throw error;
        
        toast({
          title: "Quotation created successfully!",
          description: `${formData.title} has been created`,
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadQuotations();
    } catch (error: any) {
      toast({
        title: editingQuotation ? "Error updating quotation" : "Error creating quotation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const convertToEvent = async (quotation: Quotation) => {
    try {
      // Create event from quotation
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          title: quotation.title,
          client_id: quotation.client_id,
          event_type: quotation.event_type,
          event_date: quotation.event_date,
          venue: quotation.venue,
          description: quotation.description,
          total_amount: quotation.amount,
          status: 'Confirmed',
          firm_id: profile?.firm_id,
          created_by: profile?.id
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update quotation to mark as converted
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ converted_to_event: newEvent.id })
        .eq('id', quotation.id);

      if (updateError) throw updateError;

      toast({
        title: "Quotation converted to event!",
        description: `${quotation.title} has been converted to a confirmed event`,
      });

      loadQuotations();
    } catch (error: any) {
      toast({
        title: "Error converting quotation",
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
      amount: 0,
      valid_until: ''
    });
    setEditingQuotation(null);
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      title: quotation.title,
      client_id: quotation.client_id || '',
      event_type: quotation.event_type,
      event_date: quotation.event_date,
      venue: quotation.venue || '',
      description: quotation.description || '',
      amount: quotation.amount,
      valid_until: quotation.valid_until || ''
    });
    setIsDialogOpen(true);
  };

  const handleNewQuotation = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
            <p className="text-muted-foreground">Create and manage project quotations</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">Create and manage project quotations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewQuotation}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}
              </DialogTitle>
              <DialogDescription>
                {editingQuotation 
                  ? 'Update quotation information below.'
                  : 'Create a new quotation for a potential project. Fill in the details below.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quotation Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter quotation title"
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
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter quotation amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter quotation description"
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
                  {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotations Grid */}
      {quotations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Quotations Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start managing your quotes by creating your first quotation. 
              Track from quote to confirmed event.
            </p>
            <Button onClick={handleNewQuotation}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Quotation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{quotation.title}</CardTitle>
                    <CardDescription className="truncate">
                      {quotation.client?.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {quotation.converted_to_event ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Converted
                      </Badge>
                    ) : quotation.valid_until && isExpired(quotation.valid_until) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(quotation)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(quotation.event_date).toLocaleDateString()}</span>
                </div>
                {quotation.venue && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{quotation.venue}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-lg font-semibold">
                    <DollarSign className="h-5 w-5" />
                    <span>₹{quotation.amount.toLocaleString()}</span>
                  </div>
                </div>
                
                {quotation.valid_until && (
                  <div className="text-xs text-muted-foreground">
                    Valid until: {new Date(quotation.valid_until).toLocaleDateString()}
                  </div>
                )}

                {!quotation.converted_to_event && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => convertToEvent(quotation)}
                      disabled={quotation.valid_until && isExpired(quotation.valid_until)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Convert to Event
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{quotation.event_type}</Badge>
                  <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotationManagement;