import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import FirmManagement from '@/components/FirmManagement';

interface Firm {
  id: string;
  name: string;
  spreadsheet_id: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadFirms();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFirms = async () => {
    try {
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFirms(data || []);
    } catch (error: any) {
      console.error('Error loading firms:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please sign in to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Studio Management</h1>
            <p className="text-muted-foreground">Welcome back, {profile.full_name}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Name:</span> {profile.full_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Mobile:</span> {profile.mobile_number}
              </div>
              <div>
                <span className="font-medium">Role:</span> 
                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                  {profile.role}
                </span>
              </div>
              {profile.firm_id && (
                <div>
                  <span className="font-medium">Firm ID:</span> {profile.firm_id}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">View Events</Button>
              <Button variant="outline" className="w-full">Manage Tasks</Button>
              <Button variant="outline" className="w-full">Financial Reports</Button>
            </CardContent>
          </Card>
        </div>

        {profile.role === 'Admin' && (
          <div className="mt-8">
            <FirmManagement firms={firms} onRefresh={loadFirms} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;