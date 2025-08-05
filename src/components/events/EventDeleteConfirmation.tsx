import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/studio';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { useAuth } from '@/components/auth/AuthProvider';

interface EventDeleteConfirmationProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EventDeleteConfirmation = ({ event, open, onOpenChange, onSuccess }: EventDeleteConfirmationProps) => {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const handleDelete = async () => {
    if (!event || !profile?.current_firm_id) return;
    
    setDeleting(true);
    
    try {
      console.log('🗑️ Starting PRIORITY Google Sheets deletion for:', event.id);
      
      // Step 1: Immediately remove from UI for instant responsiveness
      onSuccess(); // This removes the card from UI instantly
      onOpenChange(false); // Close the dialog
      
      // Step 2: CRITICAL - Delete from Google Sheets FIRST while event exists in database
      // This is the PRIMARY operation that depends on database data
      try {
        console.log('🗑️ PRIORITY: Deleting from Google Sheets while data exists...');
        const { error: sheetError } = await supabase.functions.invoke('delete-item-from-google', {
          body: { 
            itemType: 'event', 
            itemId: event.id, 
            firmId: profile.current_firm_id 
          }
        });
        
        if (sheetError) {
          console.error('❌ CRITICAL: Google Sheets deletion failed:', sheetError);
          throw new Error(`Google Sheets deletion failed: ${sheetError.message}`);
        }
        
        console.log('✅ PRIORITY: Google Sheets deletion successful');
      } catch (sheetError) {
        console.error('❌ CRITICAL: Google Sheets deletion error:', sheetError);
        // Don't continue if Google Sheets deletion fails - this is critical
        throw new Error(`Failed to delete from Google Sheets: ${sheetError}`);
      }

      // Step 3: Now safely delete related data in parallel (database operations)
      console.log('🗑️ Deleting related database records...');
      const deleteOperations = await Promise.allSettled([
        supabase.from('quotations').update({ converted_to_event: null }).eq('converted_to_event', event.id),
        supabase.from('event_staff_assignments').delete().eq('event_id', event.id),
        supabase.from('payments').delete().eq('event_id', event.id),
        supabase.from('tasks').delete().eq('event_id', event.id),
        supabase.from('freelancer_payments').delete().eq('event_id', event.id),
        supabase.from('staff_payments').delete().eq('event_id', event.id)
      ]);

      // Step 4: Finally delete the main event from database
      console.log('🗑️ Deleting main event from database...');
      const { error: eventDeleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (eventDeleteError) {
        console.error('❌ Event deletion failed:', eventDeleteError);
        throw eventDeleteError;
      }

      // Log any relation deletion failures (but don't fail the whole operation)
      deleteOperations.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`⚠️ Related data deletion ${index} failed:`, result.reason);
        }
      });

      toast({
        title: "Event deleted successfully",
        description: `"${event.title}" has been completely removed from both database and Google Sheets!`,
      });
      
    } catch (error: any) {
      console.error('❌ Event deletion failed:', error);
      
      // If deletion fails, reload the data to restore UI state
      onSuccess(); // This will refresh and restore the card if deletion failed
      
      toast({
        title: "Error deleting event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <EnhancedConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      title="Delete Event"
      description={`You are about to permanently delete "${event.title}" and ALL related data including payments, staff assignments, and tasks. This action cannot be undone.`}
      variant="destructive"
      confirmText={deleting ? "Deleting..." : "Delete Event"}
      requireTextConfirmation={true}
      confirmationKeyword="DELETE EVENT"
      loading={deleting}
    />
  );
};