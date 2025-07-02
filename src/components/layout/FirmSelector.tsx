
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import FirmCreationDialog from '@/components/FirmCreationDialog';

interface Firm {
  id: string;
  name: string;
  role?: string;
}

const FirmSelector = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [currentFirm, setCurrentFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserFirms();
    }
  }, [user, profile]);

  const loadUserFirms = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get firms where user is a member
      const { data: memberFirms, error: memberError } = await supabase
        .from('firm_members')
        .select(`
          role,
          firm:firms(id, name)
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Get firms created by user (if they're not already members)
      const { data: ownedFirms, error: ownedError } = await supabase
        .from('firms')
        .select('id, name')
        .eq('created_by', user.id);

      if (ownedError) throw ownedError;

      // Combine and deduplicate firms
      const allFirms: Firm[] = [];
      const firmIds = new Set();

      // Add member firms
      memberFirms?.forEach(member => {
        if (member.firm && !firmIds.has(member.firm.id)) {
          allFirms.push({
            id: member.firm.id,
            name: member.firm.name,
            role: member.role
          });
          firmIds.add(member.firm.id);
        }
      });

      // Add owned firms not already in member firms
      ownedFirms?.forEach(firm => {
        if (!firmIds.has(firm.id)) {
          allFirms.push({
            id: firm.id,
            name: firm.name,
            role: 'Owner'
          });
          firmIds.add(firm.id);
        }
      });

      setFirms(allFirms);

      // Set current firm based on profile
      if (profile?.current_firm_id) {
        const current = allFirms.find(f => f.id === profile.current_firm_id);
        setCurrentFirm(current || null);
      } else if (allFirms.length > 0) {
        // Auto-select first firm if no current firm set
        setCurrentFirm(allFirms[0]);
        await switchFirm(allFirms[0].id);
      }

    } catch (error: any) {
      console.error('Error loading firms:', error);
      toast({
        title: "Error loading firms",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchFirm = async (firmId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_firm_id: firmId })
        .eq('user_id', user.id);

      if (error) throw error;

      const selectedFirm = firms.find(f => f.id === firmId);
      setCurrentFirm(selectedFirm || null);
      
      // Refresh profile to update context
      await refreshProfile();

      toast({
        title: "Firm switched",
        description: `Now viewing ${selectedFirm?.name}`,
      });

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error: any) {
      console.error('Error switching firm:', error);
      toast({
        title: "Error switching firm",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFirmCreated = async () => {
    setShowCreateDialog(false);
    await loadUserFirms();
    await refreshProfile();
  };

  if (!user || firms.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Firm</span>
        </Button>
        <FirmCreationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onFirmCreated={handleFirmCreated}
        />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="max-w-32 truncate">
              {currentFirm?.name || 'Select Firm'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Switch Firm</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {firms.map((firm) => (
            <DropdownMenuItem
              key={firm.id}
              onClick={() => switchFirm(firm.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{firm.name}</span>
                {firm.role && (
                  <span className="text-xs text-muted-foreground">{firm.role}</span>
                )}
              </div>
              {currentFirm?.id === firm.id && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Firm</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FirmCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onFirmCreated={handleFirmCreated}
      />
    </>
  );
};

export default FirmSelector;
