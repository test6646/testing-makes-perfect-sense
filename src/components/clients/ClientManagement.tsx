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
import { useToast } from '@/hooks/use-toast';
import { Plus, Phone, Mail, MapPin, Edit, Calendar, Users } from 'lucide-react';
import { Client, ClientFormData } from '@/types/studio';

const ClientManagement = () => {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadClients();
    }
  }, [profile]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', profile?.firm_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name.trim(),
            email: formData.email?.trim() || null,
            phone: formData.phone.trim(),
            address: formData.address?.trim() || null,
            notes: formData.notes?.trim() || null,
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        
        toast({
          title: "Client updated successfully!",
          description: `${formData.name} has been updated`,
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            firm_id: profile?.firm_id,
            name: formData.name.trim(),
            email: formData.email?.trim() || null,
            phone: formData.phone.trim(),
            address: formData.address?.trim() || null,
            notes: formData.notes?.trim() || null,
          });

        if (error) throw error;
        
        toast({
          title: "Client added successfully!",
          description: `${formData.name} has been added to your client list`,
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadClients();
    } catch (error: any) {
      toast({
        title: editingClient ? "Error updating client" : "Error adding client",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone,
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleNewClient = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage your client database</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client database</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewClient}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
              <DialogDescription>
                {editingClient 
                  ? 'Update client information below.'
                  : 'Add a new client to your database. Fill in their details below.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter client's full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter client's address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about the client"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
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
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Clients Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start building your client database by adding your first client. 
              You can track their events, payments, and communication history.
            </p>
            <Button onClick={handleNewClient}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Added {new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="secondary">Client</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientManagement;