
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface FirmCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFirmCreated: () => void;
}

const FirmCreationDialog = ({ open, onOpenChange, onFirmCreated }: FirmCreationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firmName, setFirmName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firmName.trim()) {
      toast({
        title: "Validation Error",
        description: "Firm name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Call the edge function to create firm with spreadsheet
      const { data, error } = await supabase.functions.invoke('create-firm-with-spreadsheet', {
        body: { firmName: firmName.trim() },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Firm created successfully!",
        description: `${firmName} has been created with integrated Google Spreadsheet`,
      });

      setFirmName('');
      onOpenChange(false);
      onFirmCreated();
    } catch (error: any) {
      console.error('Error creating firm:', error);
      toast({
        title: "Error creating firm",
        description: error.message || "Failed to create firm. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Create New Firm</span>
          </DialogTitle>
          <DialogDescription>
            Create a new photography firm with integrated Google Spreadsheet for data management.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">Firm Name *</Label>
            <Input
              id="firmName"
              placeholder="Enter your firm name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              required
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-md">
            <h4 className="text-sm font-medium mb-2">What will be created:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• New firm in your database</li>
              <li>• Google Spreadsheet with pre-structured sheets</li>
              <li>• Events, Clients, Payments, Tasks & Expenses tracking</li>
              <li>• Real-time data synchronization</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Firm & Spreadsheet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FirmCreationDialog;
