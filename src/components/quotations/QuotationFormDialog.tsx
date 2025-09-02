
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { VenueDropdownSelect } from '@/components/forms/VenueDropdownSelect';
import { Add01Icon } from 'hugeicons-react';
import { Client, EventType, Quotation } from '@/types/studio';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: Date | undefined;
  venue: string;
  description: string;
  valid_until: Date | undefined;
}

interface QuotationFormDialogProps {
  clients: Client[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: QuotationFormData) => void;
  onNewQuotation: () => void;
  editingQuotation?: Quotation | null;
  formData?: {
    title: string;
    client_id: string;
    event_type: EventType;
    event_date: string;
    venue: string;
    description: string;
    valid_until: string;
  };
}

const eventTypes: EventType[] = ['Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others'];

const QuotationFormDialog = ({ clients, isOpen, onOpenChange, onSubmit, onNewQuotation, editingQuotation, formData: initialFormData }: QuotationFormDialogProps) => {
  const { currentFirmId } = useAuth();
  const [formData, setFormData] = useState<QuotationFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: undefined,
    venue: '',
    description: '',
    valid_until: undefined
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingQuotation && initialFormData) {
      setFormData({
        title: initialFormData.title,
        client_id: initialFormData.client_id,
        event_type: initialFormData.event_type as EventType,
        event_date: initialFormData.event_date ? new Date(initialFormData.event_date) : undefined,
        venue: initialFormData.venue,
        description: initialFormData.description,
        valid_until: initialFormData.valid_until ? new Date(initialFormData.valid_until) : undefined
      });
    } else if (!editingQuotation) {
      // Reset to default when not editing
      setFormData({
        title: '',
        client_id: '',
        event_type: 'Wedding',
        event_date: undefined,
        venue: '',
        description: '',
        valid_until: undefined
      });
    }
  }, [editingQuotation, initialFormData, isOpen]);

  // Calculate default expiry date based on event date
  const calculateDefaultExpiry = (eventDate: Date) => {
    const today = new Date();
    const thirtyDaysFromToday = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const oneDayBeforeEvent = new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    // Return whichever is shorter
    return thirtyDaysFromToday < oneDayBeforeEvent ? thirtyDaysFromToday : oneDayBeforeEvent;
  };


  // Auto-set expiry date when event date changes (works for both creation and editing)
  useEffect(() => {
    if (formData.event_date && isOpen) {
      const defaultExpiry = calculateDefaultExpiry(formData.event_date);
      setFormData(prev => ({ ...prev, valid_until: defaultExpiry }));
    }
  }, [formData.event_date?.getTime(), isOpen]);

  // Validate event date (must be future date)
  const isValidEventDate = (date: Date | undefined) => {
    if (!date) return true; // Allow empty date
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };

  const resetForm = () => {
    if (!editingQuotation) {
      setFormData({
        title: '',
        client_id: '',
        event_type: 'Wedding',
        event_date: undefined,
        venue: '',
        description: '',
        valid_until: undefined
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate event date
    if (formData.event_date && !isValidEventDate(formData.event_date)) {
      return; // Don't submit if event date is invalid
    }
    
    // Validate required fields
    if (!formData.title || !formData.client_id || !formData.event_date) {
      return; // Don't submit if required fields are missing
    }
    
    onSubmit(formData);
    resetForm();
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onNewQuotation} className="rounded-full p-3">
          <Add01Icon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>{editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              <SearchableSelect
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                options={clients.map(client => ({
                  value: client.id,
                  label: client.name
                }))}
                placeholder="Select a client"
                searchPlaceholder="Search clients..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="h-10">
                <InlineDatePicker
                  onSelect={(date) => {
                    setFormData({ ...formData, event_date: date });
                  }}
                  value={formData.event_date}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              {formData.event_date && !isValidEventDate(formData.event_date) && (
                <p className="text-sm text-destructive">Event date must be in the future</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <VenueDropdownSelect
                  value={formData.venue}
                  onValueChange={(value) => setFormData({ ...formData, venue: value })}
                  placeholder="Select or add venue..."
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <div className="h-10">
                <InlineDatePicker
                  onSelect={(date) => setFormData({ ...formData, valid_until: date })}
                  value={formData.valid_until}
                  placeholder="DD/MM/YYYY"
                />
              </div>
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
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full">
              {editingQuotation ? 'Update' : 'Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
