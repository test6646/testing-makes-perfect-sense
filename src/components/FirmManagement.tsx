import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Users } from 'lucide-react';

interface CreateFirmModalProps {
  onFirmCreated: () => void;
}

const CreateFirmModal = ({ onFirmCreated }: CreateFirmModalProps) => {
  const [open, setOpen] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateFirm = async () => {
    if (!firmName.trim()) {
      toast({
        title: "Validation Error",
        description: "Firm name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create firm with Google Sheets integration
      const { data, error } = await supabase.functions.invoke('create-firm-with-spreadsheet', {
        body: { firmName: firmName.trim() }
      });

      if (error) throw error;

      toast({
        title: "Firm created successfully!",
        description: `${firmName} has been created with integrated Google Spreadsheet`,
      });

      setFirmName('');
      setOpen(false);
      onFirmCreated();
    } catch (error: any) {
      toast({
        title: "Error creating firm",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Create New Firm
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Firm</DialogTitle>
          <DialogDescription>
            Create a new photography firm with integrated Google Spreadsheet for project management.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">Firm Name *</Label>
            <Input
              id="firmName"
              placeholder="Enter firm name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFirm()}
            />
          </div>
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              A dedicated Google Spreadsheet will be automatically created for this firm to manage events, transactions, tasks, and analytics.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFirm} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Firm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Firm {
  id: string;
  name: string;
  spreadsheet_id: string | null;
  created_at: string;
}

interface FirmManagementProps {
  firms: Firm[];
  onRefresh: () => void;
}

const FirmManagement = ({ firms, onRefresh }: FirmManagementProps) => {
  const { toast } = useToast();

  const openSpreadsheet = (spreadsheetId: string | null, firmName: string) => {
    if (spreadsheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    } else {
      toast({
        title: "Spreadsheet not available",
        description: `Google Spreadsheet for ${firmName} is not set up yet.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Firm Management
        </CardTitle>
        <CardDescription>
          Manage your photography firms and their integrated spreadsheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CreateFirmModal onFirmCreated={onRefresh} />
        
        {firms.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">Existing Firms</h4>
            {firms.map((firm) => (
              <div key={firm.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{firm.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(firm.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSpreadsheet(firm.spreadsheet_id, firm.name)}
                  disabled={!firm.spreadsheet_id}
                >
                  Open Spreadsheet
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              No firms created yet. Create your first firm to enable team member registration.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FirmManagement;