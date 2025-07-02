import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Phone, Mail, Edit, Search, UserCheck } from 'lucide-react';
import { Profile } from '@/types/studio';

const StaffManagement = () => {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const userRoles = ['Photographer', 'Videographer', 'Editor', 'Other'] as const;

  useEffect(() => {
    if (profile) {
      loadStaff();
    }
  }, [profile]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('firm_id', profile?.firm_id)
        .neq('id', profile?.id) // Exclude current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading staff",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStaffRole = async (staffId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', staffId);

      if (error) throw error;
      
      toast({
        title: "Staff role updated",
        description: `Role has been updated successfully`,
      });
      
      loadStaff();
    } catch (error: any) {
      toast({
        title: "Error updating staff role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredStaff = staff.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.mobile_number.includes(searchQuery) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
            <p className="text-muted-foreground">Manage your team members</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            {staff.length} Team Members
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff members by name, phone, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {staff.length === 0 ? 'No Staff Members Yet' : 'No matching staff found'}
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {staff.length === 0
                ? 'Staff members will appear here when they join your firm. Share your firm details with team members so they can register.'
                : 'Try adjusting your search criteria to find specific team members.'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{member.full_name}</CardTitle>
                    <CardDescription>Team Member</CardDescription>
                  </div>
                  <Badge 
                    variant={member.role === 'Admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{member.mobile_number}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <UserCheck className="h-4 w-4" />
                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                </div>

                {profile?.role === 'Admin' && member.role !== 'Admin' && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Update Role</Label>
                    <Select
                      value={member.role}
                      onValueChange={(value) => updateStaffRole(member.id, value)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Information Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            How to Add Staff Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Staff members need to register on the platform first</p>
            <p>• During registration, they should enter your firm name: <strong>{profile?.firm?.name || 'Your Firm Name'}</strong></p>
            <p>• Once they register, they will appear in this list</p>
            <p>• As an admin, you can then assign appropriate roles to each team member</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;