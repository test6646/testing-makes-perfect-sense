import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { VenueDropdownSelect } from '@/components/forms/VenueDropdownSelect';
import { SearchableStaffSelect } from '@/components/ui/searchable-staff-select';
import { useToast } from '@/hooks/use-toast';
import { Calendar03Icon, UserGroupIcon, Camera02Icon, VideoReplayIcon, AdobePremierIcon, Add01Icon, Remove01Icon, DroneIcon } from 'hugeicons-react';
import { Switch } from '@/components/ui/switch';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Event, Client, EventFormData, Quotation } from '@/types/studio';
import { sanitizeUuidFields } from '@/lib/uuid-utils';
import { EnhancedWarningDialog } from '@/components/ui/enhanced-warning-dialog';
import { getQuotationSameDayEditing, parseQuotationDetails } from '@/lib/type-utils';
import { devError } from '@/lib/cleanup-console-logs';

import type { Database } from '@/integrations/supabase/types';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import { useStaffAssignments } from './hooks/useStaffAssignments';
import SmartClientQuotationSelector from './SmartClientQuotationSelector';
import { DEFAULT_PAYMENT_METHOD, getPaymentMethodOptions, PaymentMethod } from '@/lib/payment-method-validator';
import { useEventUpdateNotifications } from '@/hooks/useEventUpdateNotifications';
import { getPersonConflictDetails, calculateEventDateRange } from '@/lib/staff-availability-utils';
import { useRealTimeConflictDetection } from '@/hooks/useRealTimeConflictDetection';
import { StaffAssignmentConflictDialog } from '@/components/ui/staff-assignment-conflict-dialog';



type EventType = Database['public']['Enums']['event_type'];

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

interface CleanEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  editingEvent?: Event | null;
  onSuccess: () => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Ring-Ceremony', label: 'Ring-Ceremony' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Maternity Photography', label: 'Maternity Photography' },
  { value: 'Others', label: 'Others' }
];

const CleanEventFormDialog = ({ open, onOpenChange, event, editingEvent, onSuccess }: CleanEventFormDialogProps) => {
  const currentEvent = editingEvent || event;
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const { sendEventUpdateNotifications } = useEventUpdateNotifications();
  const { syncItemToSheets } = useGoogleSheetsSync();
  
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  
  // Initialize form data with proper default values
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
    // Using event_staff_assignments table instead
  });

  const [extendedData, setExtendedData] = useState({
    advance_amount: 0,
    total_days: 1,
    same_day_editor: false,
    other_crew_enabled: false,
    advance_payment_method: DEFAULT_PAYMENT_METHOD as PaymentMethod,
  });

  // Same day editors now integrated into multiDayAssignments per-day structure
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [existingQuotation, setExistingQuotation] = useState<Quotation | null>(null);
  const [isEventFromQuotation, setIsEventFromQuotation] = useState(false);
  
  // Warning dialog states
  const [showAdvanceWarning, setShowAdvanceWarning] = useState(false);
  const [showDuplicateEventWarning, setShowDuplicateEventWarning] = useState(false);
  const [duplicateEventInfo, setDuplicateEventInfo] = useState<{ eventType: string; clientName: string } | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  // Check if quotation has same day editing enabled
  const quotationHasSameDayEditing = getQuotationSameDayEditing(selectedQuotation?.quotation_details as string);

  // Initialize conflict detection hook
  const { conflictState, checkForConflicts, dismissConflictDialog } = useRealTimeConflictDetection(
    currentFirmId,
    currentEvent?.id
  );

  const [multiDayAssignments, setMultiDayAssignments] = useState<Array<{
    day: number;
    photographer_ids: string[];
    cinematographer_ids: string[];
    drone_pilot_ids: string[];
    same_day_editor_ids: string[];
    other_crew_ids: string[];
  }>>([]);

  // Combine staff and freelancers, then filter by role - more inclusive filtering
  const allCombinedPeople = useMemo(() => [
    ...(allStaff || []).map(s => ({ ...s, source: 'staff' })),
    ...(freelancers || []).map(f => ({ ...f, source: 'freelancer' }))
  ], [allStaff, freelancers]);
  
  const photographers = useMemo(() => allCombinedPeople.filter(p => 
    p.role === 'Photographer' || p.role?.toLowerCase().includes('photographer') || p.role?.toLowerCase().includes('photo')
  ), [allCombinedPeople]);
  
  const cinematographers = useMemo(() => allCombinedPeople.filter(p => 
    p.role === 'Cinematographer' || p.role?.toLowerCase().includes('cinematographer') || p.role?.toLowerCase().includes('video')
  ), [allCombinedPeople]);
  
  const dronePilots = useMemo(() => allCombinedPeople.filter(p => 
    p.role === 'Drone Pilot' || p.role?.toLowerCase().includes('drone')
  ), [allCombinedPeople]);
  
  const editors = useMemo(() => allCombinedPeople.filter(p => 
    (p.role === 'Editor' || p.role?.toLowerCase().includes('editor')) &&
    !p.role?.toLowerCase().includes('same day')
  ), [allCombinedPeople]);

  const otherCrew = useMemo(() => allCombinedPeople.filter(p => 
    p.role === 'Other' || p.role === 'Admin'
  ), [allCombinedPeople]);

  // SAME DAY EDITORS: These are regular editors who go to the event location on the same day
  // to do their editing work there. All data will be provided to them at the event location.
  // They are not a separate role - they're editors with a specific assignment type.
  const sameDayEditors = useMemo(() => allCombinedPeople.filter(p => 
    p.role === 'Editor' || p.role === 'Same Day Editor'
  ), [allCombinedPeople]);

  // Remove availability filtering - now show all staff  
  useEffect(() => {
    // No need to filter availability anymore - conflict detection happens on assignment
  }, [photographers, cinematographers, editors, sameDayEditors, dronePilots]);

  // Get all staff for a specific role (no filtering)
  const getAllStaffForRole = (role: 'photographer' | 'cinematographer' | 'editor' | 'same_day_editor' | 'drone_pilot') => {
    switch (role) {
      case 'photographer':
        return photographers;
      case 'cinematographer': 
        return cinematographers;
      case 'editor':
        return editors;
      case 'same_day_editor':
        return sameDayEditors;
      case 'drone_pilot':
        return dronePilots;
      default:
        return [];
    }
  };
  
  // Load initial data when dialog opens - WAIT FOR ALL DATA BEFORE PROCEEDING
  useEffect(() => {
    if (open) {
      setFormLoading(true);
      loadAllRequiredData();
      
      // Expose refresh function for external components
      (window as any).refreshEventFormFreelancers = loadFreelancers;
    } else {
      // Cleanup when closing
      delete (window as any).refreshEventFormFreelancers;
    }
  }, [open]);

  const loadFreelancers = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data: freelancersData, error: freelancersError } = await supabase
        .from('freelancers')
        .select('id, full_name, role, phone, email')
        .eq('firm_id', currentFirmId)
        .order('full_name');

      if (freelancersError) throw freelancersError;
      setFreelancers(freelancersData || []);
    } catch (error) {
      console.error('Error loading freelancers:', error);
    }
  };

  // Combined data loading and form population effect
  const loadAllRequiredData = async () => {
    if (!currentFirmId) return;

    try {
      // STEP 1: Load all base data first
      // Loading all required data
      
      const [clientsResult, staffResult, freelancersResult] = await Promise.all([
        supabase.from('clients').select('*').eq('firm_id', currentFirmId).order('name'),
        supabase.from('profiles').select('id, full_name, role, mobile_number').eq('firm_id', currentFirmId).order('full_name'),
        supabase.from('freelancers').select('id, full_name, role, phone, email').eq('firm_id', currentFirmId).order('full_name')
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (staffResult.error) throw staffResult.error;
      if (freelancersResult.error) throw freelancersResult.error;

      setClients(clientsResult.data || []);
      setAllStaff(staffResult.data || []);
      setFreelancers(freelancersResult.data || []);
      
      
      // Base data loaded

      // STEP 2: If editing, fetch complete event data and populate form
      if (currentEvent) {
        // Loading complete event data for edit
        await populateFormWithCompleteData();
      } else {
        // STEP 3: If creating new, just reset form
        resetForm();
      }
    } catch (error: any) {
      // Error loading required data
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
      setSelectedQuotation(null);
      setExistingQuotation(null);
      setIsEventFromQuotation(false);
    }
  }, [open]);

  const loadData = async () => {
    if (!currentFirmId) return;
    
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('name');

      if (clientsError) throw clientsError;

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, role, mobile_number')
        .eq('firm_id', currentFirmId)
        .order('full_name');

      if (staffError) throw staffError;

      // Load freelancers
      const { data: freelancersData, error: freelancersError } = await supabase
        .from('freelancers')
        .select('id, full_name, role, phone, email')
        .eq('firm_id', currentFirmId)
        .order('full_name');

      if (freelancersError) throw freelancersError;

      setClients(clientsData || []);
      setAllStaff(staffData || []);
      setFreelancers(freelancersData || []);
    } catch (error: any) {
      
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const populateFormWithCompleteData = async () => {
    if (!currentEvent) return;

    try {
      
      
      // Fetch complete event with all relations including staff assignments with freelancer data AND quotation details
      const { data: completeEvent, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(*),
          event_staff_assignments(
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role)
          )
        `)
        .eq('id', currentEvent.id)
        .single();

      if (error) throw error;
      
      

      // Extract quotation details if event was created from quotation
      let quotationDetails: any = null;
      let quotationSource: Quotation | null = null;
      
      if (completeEvent.quotation_source_id) {
        const { data: completeQuotation, error: quotationError } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', completeEvent.quotation_source_id)
          .maybeSingle();
        
        if (!quotationError && completeQuotation) {
          quotationSource = completeQuotation as any;
          quotationDetails = completeQuotation.quotation_details || null;
        } else {
          // No quotation found
        }
      }

      // Set existing quotation state for edit mode
      if (quotationSource) {
        setIsEventFromQuotation(true);
        setExistingQuotation(quotationSource);
        // Edit mode linked quotation found
      } else {
        setIsEventFromQuotation(false);
        setExistingQuotation(null);
        // No linked quotation
      }

      // Populate form with complete data
      setFormData({
        title: completeEvent.title || '',
        client_id: completeEvent.client_id || '',
        event_type: completeEvent.event_type || 'Wedding',
        event_date: completeEvent.event_date || '',
        venue: completeEvent.venue || '',
        description: completeEvent.description || '',
        total_amount: completeEvent.total_amount || 0,
        // Using event_staff_assignments table instead
      });

      setExtendedData({
        advance_amount: completeEvent.advance_amount || 0,
        total_days: completeEvent.total_days || 1,
        same_day_editor: completeEvent.same_day_editor || false,
        other_crew_enabled: completeEvent.other_crew_enabled || false,
        advance_payment_method: (completeEvent as any).advance_payment_method || (DEFAULT_PAYMENT_METHOD as PaymentMethod),
      });

      // Store quotation details in currentEvent for use in assignment processing
      if (quotationDetails) {
        (completeEvent as any).quotation_details = quotationDetails;
      }

    // CRITICAL: Wait a moment for React to process the state updates
      // before processing assignments to ensure allCombinedPeople is available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load and process staff assignments with proper freelancer support
      if (completeEvent.event_staff_assignments?.length > 0) {
        await processExistingStaffAssignments(completeEvent.event_staff_assignments, completeEvent);
      } else {
        // CRITICAL FIX: Always use the hook's processExistingStaffAssignments method
        // even when no assignments exist, so it properly applies quotation details
        await processExistingStaffAssignments([], completeEvent);
      }

      // Return complete event data for reference
      return { completeEvent, quotationDetails };

      
    } catch (error: any) {
      
      throw error;
    }
  };

  const processExistingStaffAssignments = async (assignments: any[], eventData?: any) => {
    // Processing existing staff assignments
    
    // Group assignments by day and role, handling both staff and freelancers
    const groupedByDay = new Map();
    
    assignments.forEach(assignment => {
      const dayKey = assignment.day_number;
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          drone_pilot_ids: [],
          same_day_editor_ids: [],
          other_crew_ids: []
        });
      }
      
      const dayData = groupedByDay.get(dayKey);
      
      // FIXED: Get the correct ID - either staff_id or freelancer_id
      const assigneeId = assignment.staff_id || assignment.freelancer_id;
      const staffType = assignment.staff_id ? 'staff' : 'freelancer';
      
      
      
      // Verify the assignee exists in our combined list
      const assigneeExists = allCombinedPeople.find(person => person.id === assigneeId);
      if (!assigneeExists) {
        
      }
      
      if (assigneeId) {
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assigneeId);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assigneeId);
        } else if (assignment.role === 'Editor') {
          dayData.same_day_editor_ids.push(assigneeId);
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_ids.push(assigneeId);
        } else if (assignment.role === 'Same Day Editor') {
          dayData.same_day_editor_ids.push(assigneeId);
        }
      } else {
        
      }
    });
    
    // Get quotation details for proper slot calculation
    const quotationDetails = eventData?.quotation_details || (currentEvent as any)?.quotation_details;
    
    
    // Convert map to array and ensure all days are represented
    const totalDays = eventData?.total_days || (currentEvent as any)?.total_days || 1;
    const processedAssignments = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const dayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        drone_pilot_ids: [],
        same_day_editor_ids: [],
        other_crew_ids: []
      };
      
      // CRITICAL FIX: Use quotation data to determine required slots for editing
      if (quotationDetails?.days) {
        const dayConfig = quotationDetails.days[day - 1];
        if (dayConfig) {
          const requiredPhotographers = dayConfig.photographers || 0;
          const requiredCinematographers = dayConfig.cinematographers || 0;
          const requiredDrone = dayConfig.drone || 0;
          
          // Set exact slot counts from quotation (even if 0)
          dayData.photographer_ids = Array(requiredPhotographers).fill('').map((_, i) => dayData.photographer_ids[i] || '');
          dayData.cinematographer_ids = Array(requiredCinematographers).fill('').map((_, i) => dayData.cinematographer_ids[i] || '');
          dayData.drone_pilot_ids = Array(requiredDrone).fill('').map((_, i) => dayData.drone_pilot_ids[i] || '');
        } else {
          // Quotation exists but no config for this day - add default slots
          if (dayData.photographer_ids.length === 0) {
            dayData.photographer_ids.push('');
          }
          if (dayData.cinematographer_ids.length === 0) {
            dayData.cinematographer_ids.push('');
          }
          if (dayData.drone_pilot_ids.length === 0) {
            dayData.drone_pilot_ids.push('');
          } else {
            dayData.drone_pilot_ids = Array.isArray(dayData.drone_pilot_ids) ? dayData.drone_pilot_ids : [];
          }
        }
      } else {
        // No quotation at all (manual event) - provide default slots for manual assignment
        if (dayData.photographer_ids.length === 0) {
          dayData.photographer_ids.push('');
        }
        if (dayData.cinematographer_ids.length === 0) {
          dayData.cinematographer_ids.push('');
        }
        if (dayData.drone_pilot_ids.length === 0) {
          dayData.drone_pilot_ids.push('');
        } else {
          dayData.drone_pilot_ids = Array.isArray(dayData.drone_pilot_ids) ? dayData.drone_pilot_ids : [];
        }
      }
      
      // Ensure drone_pilot_ids is an array even without quotation day configs
      if (!Array.isArray(dayData.drone_pilot_ids) && !quotationDetails?.days) {
        dayData.drone_pilot_ids = [];
      }
        
      processedAssignments.push(dayData);
    }
    
    processedAssignments.forEach(dayData => {
      dayData.photographer_ids.forEach((id, index) => {
        const person = allCombinedPeople.find(p => p.id === id);
        
      });
      
      dayData.cinematographer_ids.forEach((id, index) => {
        const person = allCombinedPeople.find(p => p.id === id);
        
      });
    });
    
    setMultiDayAssignments(processedAssignments);
    
    // Handle same day editors separately
    const allSameDayEditors = assignments
      .filter(a => a.role === 'Same Day Editor')
      .map(a => a.staff_id || a.freelancer_id);
    
        if (allSameDayEditors.length > 0) {
          // Same day editors now integrated into daily assignments
          setExtendedData(prev => ({
            ...prev,
            same_day_editor: true
          }));
        }
  };

  const loadEventStaffAssignments = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_staff_assignments')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number');

      if (error) throw error;

      if (data && data.length > 0) {
        
        // Group assignments by day and role
        const groupedByDay = new Map();
        
        data.forEach(assignment => {
          const dayKey = assignment.day_number;
          if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          drone_pilot_ids: [],
          same_day_editor_ids: [],
          other_crew_ids: []
        });
          }
          
          const dayData = groupedByDay.get(dayKey);
          
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assignment.staff_id || assignment.freelancer_id);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assignment.staff_id || assignment.freelancer_id);
        } else if (assignment.role === 'Editor') {
          dayData.same_day_editor_ids.push(assignment.staff_id || assignment.freelancer_id);
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_ids.push(assignment.staff_id || assignment.freelancer_id);
        } else if (assignment.role === 'Same Day Editor') {
          dayData.same_day_editor_ids.push(assignment.staff_id || assignment.freelancer_id);
        } else if (assignment.role === 'Other') {
          dayData.other_crew_ids.push(assignment.staff_id || assignment.freelancer_id);
        }
        });
        
        // Convert map to array and ensure all days are represented
        const totalDays = (currentEvent as any)?.total_days || 1;
        const processedAssignments = [];
        
        for (let day = 1; day <= totalDays; day++) {
      const dayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        drone_pilot_ids: [],
        same_day_editor_ids: [],
        other_crew_ids: []
      };
          
          // Only show assigned crew members, no empty slots unless needed
          dayData.photographer_ids = dayData.photographer_ids.length > 0 
            ? dayData.photographer_ids 
            : [''];
          dayData.cinematographer_ids = dayData.cinematographer_ids.length > 0 
            ? dayData.cinematographer_ids 
            : [''];
            
          processedAssignments.push(dayData);
        }
        
        
        setMultiDayAssignments(processedAssignments);
        
        // Handle same day editors separately
        const allSameDayEditors = data
          .filter(a => a.role === 'Same Day Editor')
          .map(a => a.staff_id);
        
          if (allSameDayEditors.length > 0) {
            
            // Same day editors integrated into daily assignments
            setExtendedData(prev => ({
              ...prev,
              same_day_editor: true
            }));
          }
      } else {
        
        // No existing assignments, do not create default slots
        // Wait for quotation to determine proper slot structure
        setMultiDayAssignments([]);
      }
    } catch (error: any) {
      
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
      total_amount: 0,
      // Using event_staff_assignments table instead
    });

    setExtendedData({
      advance_amount: 0,
      total_days: 1,
      same_day_editor: false,
      other_crew_enabled: false,
      advance_payment_method: DEFAULT_PAYMENT_METHOD as PaymentMethod,
    });
    
    setMultiDayAssignments([
      { day: 1, photographer_ids: [''], cinematographer_ids: [''], drone_pilot_ids: [''], same_day_editor_ids: [], other_crew_ids: [] }
    ]);
  };

  const handleQuotationSelect = (quotation: Quotation | null) => {
    setSelectedQuotation(quotation);
    
    if (quotation) {
      // Extract days from quotation details
      let totalDays = 1;
      
      if (quotation.quotation_details) {
        const details = quotation.quotation_details as any;
        
        // Check if days array exists and get its length
        if (details?.days && Array.isArray(details.days)) {
          totalDays = details.days.length;
        } else {
          // Fallback to other possible keys
          totalDays = details?.total_days || 
                     details?.duration_days ||
                     details?.event_days ||
                     (details?.duration ? parseInt(details.duration) : 1) ||
                     1;
        }

        // Check for same day editor in quotation details
        if (details?.sameDayEditorEnabled) {
          setExtendedData(prev => ({
            ...prev,
            same_day_editor: details.sameDayEditorEnabled,
          }));
        }
      }
      
      // Ensure totalDays is a valid number and within reasonable bounds
      if (isNaN(totalDays) || totalDays < 1) {
        totalDays = 1;
      }
      if (totalDays > 10) {
        totalDays = 10; // Cap at 10 days max
      }
      
      setFormData(prev => ({
        ...prev,
        title: quotation.title,
        event_type: quotation.event_type,
        event_date: quotation.event_date,
        venue: quotation.venue || '',
        description: quotation.description || '',
        total_amount: (quotation.discount_amount && quotation.discount_amount > 0) 
          ? (quotation.amount - quotation.discount_amount) 
          : quotation.amount,
      }));

      setExtendedData(prev => ({
        ...prev,
        total_days: totalDays,
      }));

      // Initialize multi-day staff assignments based on extracted days and quotation crew config
      const dayAssignments = [];
      const quotationDetails = quotation.quotation_details as any;
      
      for (let i = 1; i <= totalDays; i++) {
        // Get quotation crew configuration for this day
        const dayConfig = quotationDetails?.days?.[i - 1];
        
        // Create exact number of dropdowns based on quotation counts
        const photographerCount = dayConfig?.photographers || 0;
        const cinematographerCount = dayConfig?.cinematographers || 0;
        const droneCount = dayConfig?.drone || 0;
        
        dayAssignments.push({
          day: i,
          photographer_ids: photographerCount > 0 ? Array(photographerCount).fill('') : [],
          cinematographer_ids: cinematographerCount > 0 ? Array(cinematographerCount).fill('') : [],
          drone_pilot_ids: droneCount > 0 ? [''] : [],
          same_day_editor_ids: dayConfig?.sameDayEditors ? Array(dayConfig.sameDayEditors).fill('') : (quotationDetails?.sameDayEditing ? [''] : []),
          other_crew_ids: [],
        });
      }
      setMultiDayAssignments(dayAssignments);
    }
  };

  const calculateBalance = () => {
    return formData.total_amount - extendedData.advance_amount;
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.event_date) {
      toast({
        title: "Validation Error", 
        description: "Event date is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.venue?.trim()) {
      toast({
        title: "Validation Error",
        description: "Venue is required",
        variant: "destructive",
      });
      return false;
    }

    // Validate advance amount vs total bill
    if (extendedData.advance_amount > formData.total_amount) {
      setShowAdvanceWarning(true);
      return false;
    }

    // Same day editor assignments are now optional - removed validation

    return true;
  };

  const checkForDuplicateEvents = async (): Promise<boolean> => {
    if (!currentFirmId || !formData.client_id || !formData.event_type || currentEvent) {
      return true; // Skip check for edits or incomplete data
    }

    try {
      const { data: existingEvents, error } = await supabase
        .from('events')
        .select('id, title, event_type, client:clients(name)')
        .eq('firm_id', currentFirmId)
        .eq('client_id', formData.client_id)
        .eq('event_type', formData.event_type)
        .limit(1);

      if (error) throw error;

      if (existingEvents && existingEvents.length > 0) {
        const client = clients.find(c => c.id === formData.client_id);
        setDuplicateEventInfo({
          eventType: formData.event_type,
          clientName: client?.name || 'Unknown Client'
        });
        setShowDuplicateEventWarning(true);
        return false;
      }

      return true;
    } catch (error) {
      
      return true; // Allow creation if check fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFirmId || !validateForm()) return;

    // Check for duplicate events only for new events
    if (!currentEvent && !(await checkForDuplicateEvents())) {
      return;
    }

    await processEventSubmission();
  };

  const processEventSubmission = async () => {
    if (!currentFirmId) return;

    setLoading(true);
    
    // IMMEDIATE UI RESPONSE - Show optimistic loading state
    toast({
      title: "Saving...",
      description: "Creating your event...",
    });

    try {
      const sanitizedFormData = sanitizeUuidFields(formData, [
        'client_id'
      ]);

      const eventData = {
        ...sanitizedFormData,
        ...extendedData,
        firm_id: currentFirmId,
        created_by: profile.id,
        balance_amount: calculateBalance(),
        // CRITICAL FIX: Preserve existing quotation_source_id for updates, use selected for new events
        quotation_source_id: currentEvent ? 
          (selectedQuotation?.id || existingQuotation?.id || (currentEvent as any)?.quotation_source_id || null) :
          (selectedQuotation?.id || null),
        total_days: extendedData.total_days,
        // Same day editor is now handled within staff assignments
        advance_payment_method: extendedData.advance_payment_method,
      };

      let result;
      if (currentEvent) {
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', currentEvent.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        // Send update notifications in the background
        const fieldsToCheckForUpdate = ['title', 'venue', 'event_date', 'description', 'total_amount'];
        const updatedFields = fieldsToCheckForUpdate.filter(field => {
          const oldVal = (currentEvent as any)[field];
          const newVal = eventData[field as keyof typeof eventData];
          return oldVal !== newVal;
        });

        if (updatedFields.length > 0) {
          sendEventUpdateNotifications({
            eventId: currentEvent.id,
            eventTitle: eventData.title,
            eventDate: eventData.event_date,
            venue: eventData.venue,
            firmId: currentFirmId,
            updatedFields
          });
        }
        
        // Save integrated staff assignments (including same day editors)
        
        await saveStaffAssignments(result.id);
        
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        // Critical operations only - staff assignments and quotation conversion
        await Promise.all([
          saveStaffAssignments(result.id),
          selectedQuotation ? supabase
            .from('quotations')
            .update({ converted_to_event: result.id })
            .eq('id', selectedQuotation.id) : Promise.resolve()
        ]);
      }

      // INSTANT SUCCESS RESPONSE
      const hasStaffAssigned = multiDayAssignments.some(day => 
        day.photographer_ids.some(id => id && id.trim() !== '') || 
        day.cinematographer_ids.some(id => id && id.trim() !== '') ||
        day.drone_pilot_ids.some(id => id && id.trim() !== '') ||
        day.same_day_editor_ids.some(id => id && id.trim() !== '')
      );
      
      toast({
        title: currentEvent ? "✅ Event Updated!" : "✅ Event Created!",
        description: currentEvent 
          ? "Event updated successfully" 
          : hasStaffAssigned 
            ? "Event created! Notifications being sent..."
            : "Event created successfully",
      });

      // BACKGROUND event confirmation notification for new events - Fire and forget
      if (!currentEvent && formData.client_id) {
        const client = clients.find(c => c.id === formData.client_id);
        if (client?.phone) {
          supabase.functions.invoke('send-event-confirmation', {
            body: {
              clientName: client.name,
              clientPhone: client.phone,
              eventName: formData.title,
              eventDate: formData.event_date,
              venue: formData.venue || '~',
              totalAmount: formData.total_amount || 0,
              firmId: currentFirmId,
              totalDays: extendedData.total_days || 1,
              eventEndDate: null // Will be calculated in the function based on totalDays
            }
          }).then((result) => {
            // Event confirmation sent successfully
            if (result.error) {
              
            } else {
              // Event confirmation sent successfully
            }
          }).catch(error => {
            
          });
        } else {
          // Event saved successfully - removed console.log for production
        }
      }

      // IMMEDIATELY close dialog and refresh
      onSuccess();
      onOpenChange(false);
      
      // ALL BACKGROUND OPERATIONS - Run asynchronously
      const runBackgroundTasks = async () => {
        try {
          const hasAssignedStaff = multiDayAssignments.some(day => 
            day.photographer_ids.some(id => id && id.trim() !== '') || 
            day.cinematographer_ids.some(id => id && id.trim() !== '') || 
            day.drone_pilot_ids.some(id => id && id.trim() !== '')
          ) || multiDayAssignments.some(day => day.same_day_editor_ids.some(id => id && id.trim() !== ''));

          // Background sync operations using centralized service
          await Promise.allSettled([
            supabase.functions.invoke('sync-event-to-calendar', {
              body: { eventId: result.id }
            }),
            // Use enhanced sync coordinator
            import('@/services/syncCoordinator').then(({ syncEvent }) => {
              syncEvent(result.id, result.firm_id, currentEvent ? 'update' : 'create', 'event-form');
            }),
            sendEventNotifications(result.id, formData.title)
          ]);
          
          // Background operations completed
        } catch (error) {
          // Background operations completed with some errors (non-critical)
        }
      };
      
      runBackgroundTasks();

    } catch (error: any) {
      
      toast({
        title: currentEvent ? "❌ Update Failed" : "❌ Creation Failed",
        description: error.message || "Please check all fields and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEventNotifications = async (eventId: string, eventTitle: string) => {
    try {
      // Get new assignments from storage (set during save)
      const newStaffAssignments = (window as any).newStaffAssignments || [];
      const removedStaffAssignments = (window as any).removedStaffAssignments || [];
      
      // Send removal notifications first
      if (removedStaffAssignments.length > 0) {
        // Get event details for unassignment notifications
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            client:clients(name, phone)
          `)
          .eq('id', eventId)
          .single();

        if (!eventError && eventData) {
          for (const removedAssignment of removedStaffAssignments) {
            const isStaff = !!removedAssignment.staff;
            const name = isStaff ? removedAssignment.staff?.full_name : removedAssignment.freelancer?.full_name;
            const phone = isStaff ? removedAssignment.staff?.mobile_number : removedAssignment.freelancer?.phone;
            
            if (phone && name) {
              const unassignmentBody = {
                staffName: name,
                staffPhone: phone,
                eventName: eventData.title,
                role: removedAssignment.role,
                dayNumber: removedAssignment.day_number,
                totalDays: eventData.total_days,
                eventDate: eventData.event_date,
                eventEndDate: eventData.event_end_date,
                venue: eventData.venue,
                clientName: eventData.client?.name,
                firmId: eventData.firm_id || currentFirmId,
                notificationType: 'event_unassignment' as const,
              };

               // BACKGROUND UNASSIGNMENT NOTIFICATION - Fire and forget
               supabase.functions.invoke('send-staff-notification', { body: unassignmentBody })
                 .then(() => {
                   
                 })
                 .catch(unassignmentError => {
                   
                 });
            }
          }
        }
      }
      
      // If editing and no new assignments, skip assignment notifications
      if (currentEvent && newStaffAssignments.length === 0) {
        
        return;
      }

      // Get full event details for notifications
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone)
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        
        return;
      }

      // For new events, get all assignments; for edits, only get newly assigned staff
      let assignments;
      if (currentEvent) {
        // For edited events, only fetch assignments for newly added staff
        const newAssignmentIds = newStaffAssignments.map(a => a.staff_id || a.freelancer_id);
        if (newAssignmentIds.length === 0) return;
        
        const { data: newAssignmentData, error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role, mobile_number),
            freelancer:freelancers(id, full_name, role, phone, email)
          `)
          .eq('event_id', eventId)
          .or(newAssignmentIds.map(id => `staff_id.eq.${id},freelancer_id.eq.${id}`).join(','));
        
        assignments = newAssignmentData;
        
      } else {
        // For new events, get all assignments
        const { data: allAssignments, error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role, mobile_number),
            freelancer:freelancers(id, full_name, role, phone, email)
          `)
          .eq('event_id', eventId);
        
        assignments = allAssignments;
        
      }

      if (!assignments || assignments.length === 0) {
        
        return;
      }

      // Send notifications to each assigned staff member via WhatsApp (firm-specific session)
      for (const assignment of assignments) {
        const isStaff = !!assignment.staff;
        const name = isStaff ? (assignment.staff as any).full_name : (assignment.freelancer as any)?.full_name;
        const phone = isStaff ? (assignment.staff as any).mobile_number : (assignment.freelancer as any)?.phone;
        
        if (!phone) {
          
          continue;
        }

        const body = {
          staffName: name,
          staffPhone: phone,
          eventName: eventData.title,
          role: assignment.role,
          dayNumber: assignment.day_number,
          totalDays: eventData.total_days,
          eventDate: eventData.event_date,
          eventEndDate: eventData.event_end_date,
          venue: eventData.venue,
          clientName: eventData.client?.name,
          clientPhone: eventData.client?.phone,
          firmId: eventData.firm_id || currentFirmId,
          notificationType: 'event_assignment' as const,
        };

        // BACKGROUND staff notification - Fire and forget
        supabase.functions.invoke('send-staff-notification', { body }).then(({ error }) => {
          if (error) {
            
          } else {
            
          }
        }).catch(whatsappError => {
          
        });
      }
    } catch (error) {
      // Error in sendEventNotifications
    }
  };

  const saveStaffAssignments = async (eventId: string) => {
    try {
      // Current multiDayAssignments processed
      
      // All freelancers available processed
      
      // Get existing assignments to track new ones for notifications AND removed ones
      const { data: existingAssignments, error: existingError } = await supabase
        .from('event_staff_assignments')
        .select(`
          staff_id, 
          freelancer_id, 
          role, 
          day_number,
          staff:profiles(id, full_name, role, mobile_number),
          freelancer:freelancers(id, full_name, role, phone, email)
        `)
        .eq('event_id', eventId);
      
      if (existingError) {
        // Error fetching existing assignments
      }
      
      // Create a set of existing assignment keys for comparison
      const existingAssignmentKeys = new Set(
        (existingAssignments || []).map(a => 
          `${a.staff_id || a.freelancer_id}-${a.role}-${a.day_number}`
        )
      );
      
      // Delete existing assignments first for clean slate
      const { error: deleteError } = await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', eventId);
        
        if (deleteError) {
        // Error deleting existing assignments
        throw deleteError;
      }

      // Create lookup maps for staff and freelancers
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      const freelancerMap = new Map(freelancers.map(f => [f.id, f]));
      const allStaffIds = new Set([...staffMap.keys(), ...freelancerMap.keys()]);
      
      // Staff and freelancer IDs loaded

      // Insert new assignments with proper staff_type and freelancer support
      const assignments = [];
      
      for (const dayAssignment of multiDayAssignments) {
        // Processing day assignment
        
        const eventDate = new Date(formData.event_date);
        const dayDate = new Date(eventDate);
        dayDate.setDate(eventDate.getDate() + (dayAssignment.day - 1));

        // Add all photographers for this day (filter out empty strings and validate IDs)
        const validPhotographerIds = dayAssignment.photographer_ids.filter(id => id && id.trim() !== '');
        // Valid photographer IDs processed
        
        validPhotographerIds.forEach(photographerId => {
          if (allStaffIds.has(photographerId)) {
            const isFreelancer = freelancerMap.has(photographerId);
            const person = isFreelancer ? freelancerMap.get(photographerId) : staffMap.get(photographerId);
            
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : photographerId,
              freelancer_id: isFreelancer ? photographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Photographer',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: currentFirmId,
            });
          } else {
            // Invalid photographer ID - not found
          }
        });

        // Add all cinematographers for this day (filter out empty strings and validate IDs)
        const validCinematographerIds = dayAssignment.cinematographer_ids.filter(id => id && id.trim() !== '');
        // Valid cinematographer IDs processed
        
        validCinematographerIds.forEach(cinematographerId => {
          if (allStaffIds.has(cinematographerId)) {
            const isFreelancer = freelancerMap.has(cinematographerId);
            const person = isFreelancer ? freelancerMap.get(cinematographerId) : staffMap.get(cinematographerId);
            
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : cinematographerId,
              freelancer_id: isFreelancer ? cinematographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Cinematographer',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: currentFirmId,
            });
          } else {
            // Invalid cinematographer ID - not found
          }
        });

        // Editor assignments are handled by same_day_editor functionality only
        // No individual day editor assignments

        // Add other crew for this day (if any assigned and valid)
        const validOtherCrewIds = dayAssignment.other_crew_ids?.filter(id => id && id.trim() !== '') || [];
        validOtherCrewIds.forEach(crewId => {
          if (allStaffIds.has(crewId)) {
            const isFreelancer = freelancerMap.has(crewId);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : crewId,
              freelancer_id: isFreelancer ? crewId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Other',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: currentFirmId,
            });
          }
        });

        // Add drone pilot for this day (if assigned and valid)
        const validDronePilotIds = dayAssignment.drone_pilot_ids?.filter(id => id && id.trim() !== '') || [];
        validDronePilotIds.forEach(dronePilotId => {
          if (allStaffIds.has(dronePilotId)) {
            const isFreelancer = freelancerMap.has(dronePilotId);
            const person = isFreelancer ? freelancerMap.get(dronePilotId) : staffMap.get(dronePilotId);
            
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : dronePilotId,
              freelancer_id: isFreelancer ? dronePilotId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Drone Pilot',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: currentFirmId,
            });
          } else {
            // Invalid drone pilot ID - not found
          }
        });

        // Add all same day editors for this day (filter out empty strings and validate IDs)
        const validSameDayEditorIds = dayAssignment.same_day_editor_ids.filter(id => id && id.trim() !== '');
        // Valid same day editor IDs processed
        
        validSameDayEditorIds.forEach(editorId => {
          if (allStaffIds.has(editorId)) {
            const isFreelancer = freelancerMap.has(editorId);
            const person = isFreelancer ? freelancerMap.get(editorId) : staffMap.get(editorId);
            
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : editorId,
              freelancer_id: isFreelancer ? editorId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Same Day Editor',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: currentFirmId,
            });
          } else {
            // Invalid same day editor ID - not found
          }
        });
      }

      // Final assignments to insert processed

      // Track newly added assignments for notifications
      const newAssignments = assignments.filter(assignment => {
        const assignmentKey = `${assignment.staff_id || assignment.freelancer_id}-${assignment.role}-${assignment.day_number}`;
        return !existingAssignmentKeys.has(assignmentKey);
      });

      // Track removed assignments for unassignment notifications
      const newAssignmentKeys = new Set(
        assignments.map(a => `${a.staff_id || a.freelancer_id}-${a.role}-${a.day_number}`)
      );
      
      const removedAssignments = (existingAssignments || []).filter(assignment => {
        const assignmentKey = `${assignment.staff_id || assignment.freelancer_id}-${assignment.role}-${assignment.day_number}`;
        return !newAssignmentKeys.has(assignmentKey);
      });

      // New assignments for notifications processed

      if (assignments.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('event_staff_assignments')
          .insert(assignments)
          .select('*');

        if (insertError) {
          // Error inserting assignments
          throw insertError;
        }
        
        
        
        // Show immediate feedback in toast
        toast({
          title: "Staff Assigned Successfully",
          description: `${assignments.length} staff assignment(s) saved`,
        });

        // Store new assignments for notification purposes
        (window as any).newStaffAssignments = newAssignments;
        (window as any).removedStaffAssignments = removedAssignments;
      } else {
        
        (window as any).newStaffAssignments = [];
        (window as any).removedStaffAssignments = removedAssignments; // Still send removal notifications even if no new assignments
      }

      // Update main event table with primary photographer and cinematographer
      await updateMainEventStaffFields(eventId);
      
      // Staff assignments are now handled within multiDayAssignments
    } catch (error: any) {
      // Error saving staff assignments
      toast({
        title: "Staff Assignment Error",
        description: `Failed to save some staff assignments: ${error.message}`,
        variant: "destructive",
      });
      // Don't throw error as event creation was successful
    }
  };

  // Same day editor functions are now integrated into multiDayAssignments

  const updateMainEventStaffFields = async (eventId: string) => {
    try {
      // Get the first day's primary photographer and cinematographer
      const firstDayAssignment = multiDayAssignments.find(day => day.day === 1);
      
      const updates: any = {};
      
      // Old column updates removed - using event_staff_assignments table instead

      // Only update if we have updates to make
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId);

        if (error) throw error;
        // Updated main event staff fields
      }
    } catch (error: any) {
      // Error updating main event staff fields
    }
  };

  const updateMultiDayAssignment = (day: number, role: 'photographer_ids' | 'cinematographer_ids' | 'drone_pilot_ids' | 'same_day_editor_ids' | 'other_crew_ids', staffId: string | string[]) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { ...assignment, [role]: staffId }
          : assignment
      )
    );
  };

  // Helper function to check conflicts before assignment
  const checkConflictsAndAssign = async (
    personId: string,
    personName: string,
    role: string,
    day: number,
    onConfirmAssignment: () => void
  ) => {
    if (!personId) {
      onConfirmAssignment();
      return;
    }

    // Calculate date for this specific day
    const eventStartDate = new Date(formData.event_date);
    const dayDate = new Date(eventStartDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
    const dayDateString = dayDate.toISOString().split('T')[0];

    // Convert current multiDayAssignments to StaffAssignment format
    const currentAssignments = multiDayAssignments.flatMap(dayAssignment => {
      const assignments = [];
      const dayDate = new Date(new Date(formData.event_date).getTime() + (dayAssignment.day - 1) * 24 * 60 * 60 * 1000);
      const dayDateString = dayDate.toISOString().split('T')[0];

      // Add photographer assignments
      dayAssignment.photographer_ids.forEach(id => {
        if (id) {
          const person = allCombinedPeople.find(p => p.id === id);
          assignments.push({
            [person?.source === 'freelancer' ? 'freelancer_id' : 'staff_id']: id,
            role: 'Photographer',
            day_number: dayAssignment.day,
            day_date: dayDateString,
            event_id: currentEvent?.id || 'temp'
          });
        }
      });

      // Add cinematographer assignments
      dayAssignment.cinematographer_ids.forEach(id => {
        if (id) {
          const person = allCombinedPeople.find(p => p.id === id);
          assignments.push({
            [person?.source === 'freelancer' ? 'freelancer_id' : 'staff_id']: id,
            role: 'Cinematographer',
            day_number: dayAssignment.day,
            day_date: dayDateString,
            event_id: currentEvent?.id || 'temp'
          });
        }
      });

      // Add drone pilot assignments
      dayAssignment.drone_pilot_ids.forEach(id => {
        if (id) {
          const person = allCombinedPeople.find(p => p.id === id);
          assignments.push({
            [person?.source === 'freelancer' ? 'freelancer_id' : 'staff_id']: id,
            role: 'Drone Pilot',
            day_number: dayAssignment.day,
            day_date: dayDateString,
            event_id: currentEvent?.id || 'temp'
          });
        }
      });

      // Add same day editor assignments
      dayAssignment.same_day_editor_ids.forEach(id => {
        if (id) {
          const person = allCombinedPeople.find(p => p.id === id);
          assignments.push({
            [person?.source === 'freelancer' ? 'freelancer_id' : 'staff_id']: id,
            role: 'Same Day Editor',
            day_number: dayAssignment.day,
            day_date: dayDateString,
            event_id: currentEvent?.id || 'temp'
          });
        }
      });

      // Add other crew assignments
      dayAssignment.other_crew_ids.forEach(id => {
        if (id) {
          const person = allCombinedPeople.find(p => p.id === id);
          assignments.push({
            [person?.source === 'freelancer' ? 'freelancer_id' : 'staff_id']: id,
            role: 'Other',
            day_number: dayAssignment.day,
            day_date: dayDateString,
            event_id: currentEvent?.id || 'temp'
          });
        }
      });

      return assignments;
    });

    await checkForConflicts(
      personId,
      personName,
      role,
      dayDateString,
      1, // Single day check
      currentAssignments,
      onConfirmAssignment
    );
  };

  const addStaffToDay = (day: number, role: 'photographer_ids' | 'cinematographer_ids' | 'drone_pilot_ids', staffId: string) => {
    // Check if staff member is already assigned to the SAME role on this day
    const currentDayAssignment = multiDayAssignments.find(a => a.day === day);
    if (currentDayAssignment && staffId) {
      const isAlreadyAssignedToSameRole = role === 'photographer_ids' 
        ? currentDayAssignment.photographer_ids.includes(staffId)
        : role === 'cinematographer_ids'
        ? currentDayAssignment.cinematographer_ids.includes(staffId)
        : currentDayAssignment.drone_pilot_ids.includes(staffId);
      
      if (isAlreadyAssignedToSameRole) {
        const staffName = [...photographers, ...cinematographers].find(s => s.id === staffId)?.full_name || 'Unknown';
        alert(`${staffName} is already assigned to this role on Day ${day}.`);
        return;
      }
    }
    
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: [...(assignment[role] as string[]), staffId]
            }
          : assignment
      )
    );
  };

  const removeStaffFromDay = (day: number, role: 'photographer_ids' | 'cinematographer_ids' | 'drone_pilot_ids' | 'same_day_editor_ids' | 'other_crew_ids', staffId: string) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: (assignment[role] as string[]).filter(id => id !== staffId)
            }
          : assignment
      )
    );
  };

  const handleTotalDaysChange = (days: number) => {
    setExtendedData(prev => ({ ...prev, total_days: days }));
    
    // Generate assignments based on quotation requirements
    const newAssignments = [];
    for (let i = 1; i <= days; i++) {
      const existing = multiDayAssignments.find(a => a.day === i);
      if (existing) {
        newAssignments.push(existing);
      } else {
        const quotationDetails = parseQuotationDetails(selectedQuotation?.quotation_details as string);
        if (quotationDetails?.days?.[i - 1]) {
          const dayConfig = quotationDetails.days[i - 1];
          newAssignments.push({
            day: i,
            photographer_ids: Array(Math.max(1, dayConfig.photographers || 0)).fill(''),
            cinematographer_ids: Array(Math.max(1, dayConfig.cinematographers || 0)).fill(''),
            drone_pilot_ids: dayConfig.drone > 0 ? [''] : [],
            same_day_editor_ids: dayConfig.sameDayEditors ? Array(dayConfig.sameDayEditors).fill('') : (quotationDetails?.sameDayEditing ? [''] : []),
            other_crew_ids: []
          });
        } else {
          // For manual events (no quotation), ensure minimum 1 slot for each role
          newAssignments.push({
          day: i,
          photographer_ids: [''],
          cinematographer_ids: [''],
          drone_pilot_ids: [],
          same_day_editor_ids: [],
          other_crew_ids: []
          });
        }
      }
    }
    setMultiDayAssignments(newAssignments);
  };

  // Legacy same day editor functions removed - now handled per-day in multiDayAssignments


  // Show loading state while data is being fetched
  if (formLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[calc(100vh-6rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {currentEvent ? 'Loading Event Data...' : 'Preparing Form...'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">
              {currentEvent ? 'Fetching complete event details...' : 'Loading required data...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {currentEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seondary-900 border-b pb-2">Basic Information</h3>
             
             {/* First Row: Event Title and Client */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="Enter event title"
                    className="rounded-full"
                   required
                    disabled={false}
                 />
               </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium">
                     Client *
                   </Label>
                    <SearchableSelect 
                      value={formData.client_id || ''} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, client_id: value });
                        setSelectedQuotation(null); // Reset quotation when client changes
                      }}
                       disabled={isEventFromQuotation}
                      options={clients.map(client => ({
                        value: client.id,
                        label: `${client.name} - ${client.phone}`
                      }))}
                      placeholder="Select client"
                      
                      className="rounded-full"
                    />
               </div>
             </div>

              {/* Second Row: Active Quotation and Event Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   {formData.client_id ? (
                     <SmartClientQuotationSelector
                       selectedClientId={formData.client_id}
                       onQuotationSelect={(quotation) => {
                         setSelectedQuotation(quotation);
                         handleQuotationSelect(quotation);
                       }}
                        selectedQuotationId={isEventFromQuotation ? existingQuotation?.id : selectedQuotation?.id}
                        isEditMode={isEventFromQuotation}
                        existingQuotation={existingQuotation}
                     />
                   ) : (
                    <div>
                      <Label className="text-sm font-medium">Active Quotation</Label>
                      <div className="h-10 bg-muted/30 rounded-full flex items-center justify-center text-sm text-muted-foreground">
                        Select client first
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Event Type *</Label>
                   <Select 
                     value={formData.event_type} 
                     onValueChange={(value) => setFormData({ ...formData, event_type: value as EventType })}
                      disabled={false}
                   >
                     <SelectTrigger className="rounded-full">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {EVENT_TYPES.map((type) => (
                         <SelectItem key={type.value} value={type.value}>
                           {type.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
              </div>

              {/* Third Row: Event Date and Venue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

               <div className="space-y-2">
                 <Label className="text-sm font-medium">Event Date *</Label>
                   <InlineDatePicker
                    onSelect={(date) => setFormData({ ...formData, event_date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '' })}
                    value={formData.event_date ? new Date(formData.event_date) : undefined}
                    placeholder="DD/MM/YYYY"
                     disabled={false}
                  />
               </div>

                 <div className="space-y-2">
                   <Label className="text-sm font-medium">Venue</Label>
                   <VenueDropdownSelect
                     value={formData.venue}
                     onValueChange={(value) => setFormData({ ...formData, venue: value })}
                     placeholder="Select or add venue..."
                     className="rounded-full"
                   />
                 </div>
              </div>

              {/* Fourth Row: Days Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Number of Days *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = Math.max(1, extendedData.total_days - 1);
                        handleTotalDaysChange(newValue);
                      }}
                      disabled={extendedData.total_days <= 1}
                      className="rounded-full h-10 w-10 p-0"
                    >
                      <Remove01Icon className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-center p-2 bg-muted/50 border rounded-full h-10 flex items-center justify-center">
                      <span className="text-sm font-semibold">{extendedData.total_days} {extendedData.total_days === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = Math.min(30, extendedData.total_days + 1);
                        handleTotalDaysChange(newValue);
                      }}
                      disabled={extendedData.total_days >= 30}
                      className="rounded-full h-10 w-10 p-0"
                    >
                      <Add01Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {/* Empty space for layout balance */}
                </div>
              </div>
           </div>

          {/* Financial Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seondary-900 border-b pb-2">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Bill Amount</Label>
                <Input
                  type="number"
                  value={formData.total_amount.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, total_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Credit/Advance Amount</Label>
                <Input
                  type="number"
                  value={extendedData.advance_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setExtendedData({ ...extendedData, advance_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Advance Payment Method</Label>
                <Select 
                  value={extendedData.advance_payment_method}
                  onValueChange={(value: PaymentMethod) => setExtendedData({ ...extendedData, advance_payment_method: value })}
                >
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPaymentMethodOptions().map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Still Amount</Label>
                <div className="p-3 bg-muted/50 border rounded-full h-10 flex items-center">
                  <span className="text-sm font-semibold">₹{calculateBalance().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Staff Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seondary-900 border-b pb-2">
              Staff Assignment by Day ({extendedData.total_days} {extendedData.total_days === 1 ? 'Day' : 'Days'})
            </h3>
            
            {/* Assignment Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              {/* Same Day Editor Toggle - Only show when no quotation requirement */}
              {!quotationHasSameDayEditing && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="same-day-editor"
                    checked={extendedData.same_day_editor}
                    onCheckedChange={(checked) => {
                      setExtendedData(prev => ({ ...prev, same_day_editor: checked }));
                      
                      // When enabling same day editor, ensure each day has at least one empty slot
                      if (checked) {
                        setMultiDayAssignments(prev => 
                          prev.map(assignment => ({
                            ...assignment,
                            same_day_editor_ids: (assignment.same_day_editor_ids && assignment.same_day_editor_ids.length > 0) 
                              ? assignment.same_day_editor_ids 
                              : [''] // Add one empty slot if none exist
                          }))
                        );
                      }
                    }}
                  />
                  <Label htmlFor="same-day-editor" className="text-sm font-medium">
                    Same Day Editor
                  </Label>
                </div>
              )}

              {/* Other Crew Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="other-crew"
                  checked={extendedData.other_crew_enabled}
                  onCheckedChange={(checked) => {
                    setExtendedData(prev => ({ ...prev, other_crew_enabled: checked }));
                    
                    // When enabling other crew, ensure each day has at least one empty slot
                    if (checked) {
                      setMultiDayAssignments(prev => 
                        prev.map(assignment => ({
                          ...assignment,
                          other_crew_ids: (assignment.other_crew_ids && assignment.other_crew_ids.length > 0) 
                            ? assignment.other_crew_ids 
                            : [''] // Add one empty slot if none exist
                        }))
                      );
                    }
                  }}
                />
                <Label htmlFor="other-crew" className="text-sm font-medium">
                  Other Crew
                </Label>
              </div>
            </div>
            
            <div className="space-y-4">
              {(multiDayAssignments || []).map((dayAssignment) => (
                <div key={dayAssignment.day} className="border rounded-xl p-4 bg-card shadow-sm">
                  <h4 className="text-base font-semibold mb-3 text-primary flex items-center justify-between">
                    <span>Day {dayAssignment.day}</span>
                    {extendedData.total_days > 1 && (
                      <span className="text-xs text-muted-foreground font-normal bg-white/80 px-2 py-1 rounded-full">
                        {new Date(new Date(formData.event_date).getTime() + (dayAssignment.day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Show photographer fields - always show slots based on quotation requirements */}
                        {dayAssignment.photographer_ids.length > 0 && (
                       <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <Camera02Icon className="h-4 w-4" />
                            Photographers
                         </Label>
                         
                          {/* Selected photographers - exact count based on quotation */}
                          {(dayAssignment.photographer_ids || []).map((photographerId, index) => (
                             <div key={index} className="flex gap-2">
                                  <SearchableStaffSelect
                                    value={photographerId}
                                    onValueChange={async (value) => {
                                       // Handle clear selection
                                       if (value === '__CLEAR__') {
                                         value = '';
                                       }
                                       
                                       // Check if this staff member is already assigned to photographer role on this day
                                       if (value && value !== photographerId) {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         const isAlreadyAssignedToSameRole = (currentDayAssignment?.photographer_ids || []).includes(value);
                                         
                                         if (isAlreadyAssignedToSameRole) {
                                             const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                           alert(`${staffName} is already assigned as a photographer on Day ${dayAssignment.day}.`);
                                           return;
                                         }
                                       }
                                       
                                       // Check for conflicts if assigning someone new
                                       if (value && value !== photographerId && formData.event_date) {
                                         const person = allCombinedPeople.find(p => p.id === value);
                                         if (person) {
                                           await checkConflictsAndAssign(
                                             value,
                                             person.full_name,
                                             'Photographer',
                                             dayAssignment.day,
                                             () => {
                                               const newIds = [...dayAssignment.photographer_ids];
                                               newIds[index] = value;
                                               updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds);
                                             }
                                           );
                                         }
                                       } else {
                                         // Direct assignment for clearing or no conflicts needed
                                         const newIds = [...dayAssignment.photographer_ids];
                                         newIds[index] = value;
                                         updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds);
                                       }
                                   }}
                                   staffOptions={getAllStaffForRole('photographer')
                                      .filter(person => {
                                        const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                        if (!currentDayAssignment) return true;
                                        // Allow current selection or staff not assigned to any role on this day
                                        return person.id === photographerId ||
                                               (!(currentDayAssignment.photographer_ids || []).includes(person.id) &&
                                                 !(currentDayAssignment.cinematographer_ids || []).includes(person.id) &&
                                                !(currentDayAssignment.drone_pilot_ids || []).includes(person.id));
                                      })
                                      .map((person) => ({
                                        id: person.id,
                                        full_name: person.full_name,
                                        role: person.role
                                      }))}
                                  placeholder={`Select photographer ${index + 1}`}
                                  
                                  className="rounded-full flex-1"
                                  allowClear={true}
                                  required={selectedQuotation !== null}
                                />
                                   {/* Remove button - hide in edit mode for events from quotations */}
                                   {(() => {
                                     // In edit mode for events from quotations - never show remove buttons
                                     if (currentEvent && isEventFromQuotation) {
                                       return false;
                                     }
                                     
                                      // For new events with quotation
                                      if (!currentEvent && selectedQuotation) {
                                        const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                                        const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                        const requiredCount = dayConfig?.photographers || 0;
                                        return dayAssignment.photographer_ids.length > Math.max(1, requiredCount);
                                      }
                                     
                                      // For editing events with quotation data
                                      if (currentEvent && (currentEvent as any)?.quotation_details) {
                                        const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                                        const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                        const requiredCount = dayConfig?.photographers || 0;
                                        return dayAssignment.photographer_ids.length > Math.max(1, requiredCount);
                                      }
                                     
                                     // For events without quotation - allow removing if more than 1
                                     return dayAssignment.photographer_ids.length > 1;
                                   })() && (
                                   <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       const newIds = dayAssignment.photographer_ids.filter((_, i) => i !== index);
                                       updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds.length > 0 ? newIds : ['']);
                                     }}
                                     className="rounded-full px-3"
                                   >
                                      <Remove01Icon className="h-4 w-4" />
                                   </Button>
                                 )}
                            </div>
                          ))}
                         
                             {/* Show Add button - hide in edit mode for events from quotations */}
                             {(() => {
                               // In edit mode for events from quotations - never show add buttons
                               if (currentEvent && isEventFromQuotation) {
                                 return false;
                               }
                               
                                // For new events with quotation
                                if (!currentEvent && selectedQuotation) {
                                  const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                                  const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                  const requiredCount = dayConfig?.photographers || 0;
                                  return dayAssignment.photographer_ids.length < requiredCount;
                                }
                               
                                // For editing events with quotation data
                                if (currentEvent && (currentEvent as any)?.quotation_details) {
                                  const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                                  const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                  const requiredCount = dayConfig?.photographers || 0;
                                  return dayAssignment.photographer_ids.length < requiredCount;
                                }
                               
                               // For events without quotation - allow adding
                               return !currentEvent || (!selectedQuotation && !(currentEvent as any)?.quotation_source_id);
                             })() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addStaffToDay(dayAssignment.day, 'photographer_ids', '')}
                                className="rounded-full w-full"
                              >
                                 <Add01Icon className="h-4 w-4 mr-1" />
                                Add Photographer
                              </Button>
                            )}
                       </div>
                     )}

                        {/* Show cinematographer fields - always show slots based on quotation requirements */}
                        {dayAssignment.cinematographer_ids.length > 0 && (
                        <div className="space-y-3">
                           <Label className="text-sm font-semibold flex items-center gap-2">
                             <VideoReplayIcon className="h-4 w-4" />
                              Cinematographers
                          </Label>
                          
                            {/* Selected cinematographers - exact count based on quotation */}
                            {(dayAssignment.cinematographer_ids || []).map((cinematographerId, index) => (
                             <div key={index} className="flex gap-2">
                                   <SearchableStaffSelect
                                     value={cinematographerId}
                                     onValueChange={async (value) => {
                                        // Handle clear selection
                                        if (value === '__CLEAR__') {
                                          value = '';
                                        }
                                        
                                        // Check if this staff member is already assigned to cinematographer role on this day
                                        if (value && value !== cinematographerId) {
                                          const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                          const isAlreadyAssignedToSameRole = (currentDayAssignment?.cinematographer_ids || []).includes(value);
                                          
                                          if (isAlreadyAssignedToSameRole) {
                                              const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                            alert(`${staffName} is already assigned as a cinematographer on Day ${dayAssignment.day}.`);
                                            return;
                                          }
                                        }
                                        
                                        // Check for conflicts if assigning someone new
                                        if (value && value !== cinematographerId && formData.event_date) {
                                          const person = allCombinedPeople.find(p => p.id === value);
                                          if (person) {
                                            await checkConflictsAndAssign(
                                              value,
                                              person.full_name,
                                              'Cinematographer',
                                              dayAssignment.day,
                                              () => {
                                                const newIds = [...dayAssignment.cinematographer_ids];
                                                newIds[index] = value;
                                                updateMultiDayAssignment(dayAssignment.day, 'cinematographer_ids', newIds);
                                              }
                                            );
                                          }
                                        } else {
                                          // Direct assignment for clearing or no conflicts needed
                                          const newIds = [...dayAssignment.cinematographer_ids];
                                          newIds[index] = value;
                                          updateMultiDayAssignment(dayAssignment.day, 'cinematographer_ids', newIds);
                                        }
                                    }}
                                    staffOptions={getAllStaffForRole('cinematographer')
                                       .filter(person => {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         if (!currentDayAssignment) return true;
                                         // Allow current selection or staff not assigned to any role on this day
                                        return person.id === cinematographerId ||
                                               (!(currentDayAssignment.photographer_ids || []).includes(person.id) &&
                                                 !(currentDayAssignment.cinematographer_ids || []).includes(person.id) &&
                                                 !(currentDayAssignment.drone_pilot_ids || []).includes(person.id));
                                       })
                                       .map((person) => ({
                                         id: person.id,
                                         full_name: person.full_name,
                                         role: person.role
                                       }))}
                                   placeholder={`Select cinematographer ${index + 1}`}
                                   
                                   className="rounded-full flex-1"
                                   allowClear={true}
                                   required={selectedQuotation !== null}
                                />
                                    {/* Remove button - hide in edit mode for events from quotations */}
                                    {(() => {
                                      // In edit mode for events from quotations - never show remove buttons
                                      if (currentEvent && isEventFromQuotation) {
                                        return false;
                                      }
                                      
                                       // For new events with quotation
                                       if (!currentEvent && selectedQuotation) {
                                         const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                                         const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                         const requiredCount = dayConfig?.cinematographers || 0;
                                         return dayAssignment.cinematographer_ids.length > Math.max(1, requiredCount);
                                       }
                                      
                                       // For editing events with quotation data
                                       if (currentEvent && (currentEvent as any)?.quotation_details) {
                                         const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                                         const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                         const requiredCount = dayConfig?.cinematographers || 0;
                                         return dayAssignment.cinematographer_ids.length > Math.max(1, requiredCount);
                                       }
                                      
                                      // For events without quotation - allow removing if more than 1
                                      return dayAssignment.cinematographer_ids.length > 1;
                                    })() && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newIds = dayAssignment.cinematographer_ids.filter((_, i) => i !== index);
                                        updateMultiDayAssignment(dayAssignment.day, 'cinematographer_ids', newIds.length > 0 ? newIds : ['']);
                                      }}
                                      className="rounded-full px-3"
                                    >
                                       <Remove01Icon className="h-4 w-4" />
                                    </Button>
                                  )}
                            </div>
                          ))}
                         
                             {/* Show Add button - hide in edit mode for events from quotations */}
                             {(() => {
                               // In edit mode for events from quotations - never show add buttons
                               if (currentEvent && isEventFromQuotation) {
                                 return false;
                               }
                               
                                // For new events with quotation
                                if (!currentEvent && selectedQuotation) {
                                  const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                                  const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                  const requiredCount = dayConfig?.cinematographers || 0;
                                  return dayAssignment.cinematographer_ids.length < requiredCount;
                                }
                               
                                // For editing events with quotation data
                                if (currentEvent && (currentEvent as any)?.quotation_details) {
                                  const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                                  const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                  const requiredCount = dayConfig?.cinematographers || 0;
                                  return dayAssignment.cinematographer_ids.length < requiredCount;
                                }
                               
                               // For events without quotation - allow adding
                               return !currentEvent || (!selectedQuotation && !(currentEvent as any)?.quotation_source_id);
                             })() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addStaffToDay(dayAssignment.day, 'cinematographer_ids', '')}
                                className="rounded-full w-full"
                              >
                                 <Add01Icon className="h-4 w-4 mr-1" />
                                Add Cinematographer
                              </Button>
                            )}
                        </div>
                      )}

                      {/* Drone Pilot Section - Show only when required by quotation or when no quotation */}
                      {(() => {
                         // If we have a quotation, check if drone is required for this day
                         if (selectedQuotation) {
                           const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                           const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                           const droneRequired = dayConfig?.drone || 0;
                           return droneRequired > 0;
                         }
                        
                         // For editing events with quotation data
                         if (currentEvent && (currentEvent as any)?.quotation_details) {
                           const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                           const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                           const droneRequired = dayConfig?.drone || 0;
                           return droneRequired > 0;
                         }
                        
                        // For events without quotation, always show (optional)
                        return !selectedQuotation && !(currentEvent as any)?.quotation_source_id;
                      })() && (
                       <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <DroneIcon className="h-4 w-4" />
                            Drone Pilots
                          </Label>
                          
                           {/* Selected drone pilots - allow multiple for manual events */}
                           {(dayAssignment.drone_pilot_ids || []).map((dronePilotId, index) => (
                              <div key={index} className="flex gap-2">
                                   <SearchableStaffSelect
                                     value={dronePilotId}
                                     onValueChange={async (value) => {
                                        // Handle clear selection
                                        if (value === '__CLEAR__') {
                                          value = '';
                                        }
                                        
                                        // Check if this staff member is already assigned to drone pilot role on this day
                                        if (value && value !== dronePilotId) {
                                          const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                          const isAlreadyAssignedToSameRole = (currentDayAssignment?.drone_pilot_ids || []).includes(value);
                                          
                                          if (isAlreadyAssignedToSameRole) {
                                              const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                            alert(`${staffName} is already assigned as a drone pilot on Day ${dayAssignment.day}.`);
                                            return;
                                          }
                                        }
                                        
                                        // Check for conflicts if assigning someone new
                                        if (value && value !== dronePilotId && formData.event_date) {
                                          const person = allCombinedPeople.find(p => p.id === value);
                                          if (person) {
                                            await checkConflictsAndAssign(
                                              value,
                                              person.full_name,
                                              'Drone Pilot',
                                              dayAssignment.day,
                                              () => {
                                                const newIds = [...dayAssignment.drone_pilot_ids];
                                                newIds[index] = value;
                                                updateMultiDayAssignment(dayAssignment.day, 'drone_pilot_ids', newIds);
                                              }
                                            );
                                          }
                                        } else {
                                          // Direct assignment for clearing or no conflicts needed
                                          const newIds = [...dayAssignment.drone_pilot_ids];
                                          newIds[index] = value;
                                          updateMultiDayAssignment(dayAssignment.day, 'drone_pilot_ids', newIds);
                                        }
                                    }}
                                    staffOptions={getAllStaffForRole('drone_pilot')
                                       .filter(person => {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         if (!currentDayAssignment) return true;
                                         // Allow current selection or staff not assigned to any role on this day
                                         return person.id === dronePilotId ||
                                                (!(currentDayAssignment.photographer_ids || []).includes(person.id) &&
                                                  !(currentDayAssignment.cinematographer_ids || []).includes(person.id) &&
                                                  !(currentDayAssignment.drone_pilot_ids || []).includes(person.id));
                                       })
                                       .map((person) => ({
                                         id: person.id,
                                         full_name: person.full_name,
                                         role: person.role
                                       }))}
                                   placeholder={`Select drone pilot ${index + 1} (optional)`}
                                   
                                   className="rounded-full flex-1"
                                   allowClear={true}
                                   required={false}
                                  />
                                 {/* Hide remove button in edit mode for events from quotations */}
                                 {dayAssignment.drone_pilot_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                                   <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       const newIds = dayAssignment.drone_pilot_ids.filter((_, i) => i !== index);
                                       updateMultiDayAssignment(dayAssignment.day, 'drone_pilot_ids', newIds.length > 0 ? newIds : []);
                                     }}
                                     className="rounded-full px-3"
                                   >
                                      <Remove01Icon className="h-4 w-4" />
                                   </Button>
                                 )}
                           </div>
                           ))}
                          
                              {/* Show Add button for manual events */}
                              {(() => {
                                // For new events with quotation - don't allow adding more than required
                                if (!currentEvent && selectedQuotation) {
                                  const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                                  const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                  const requiredCount = dayConfig?.drone || 0;
                                  return dayAssignment.drone_pilot_ids.length < requiredCount;
                                }
                                
                                 // For editing events with quotation data - don't allow adding more than required
                                 if (currentEvent && (currentEvent as any)?.quotation_details) {
                                   const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                                   const dayConfig = quotationDetails?.days?.[dayAssignment.day - 1];
                                   const requiredCount = dayConfig?.drone || 0;
                                   return dayAssignment.drone_pilot_ids.length < requiredCount;
                                 }
                                
                                // For manual events (no quotation) - always allow adding
                                return !selectedQuotation && !(currentEvent as any)?.quotation_source_id;
                              })() && (
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => addStaffToDay(dayAssignment.day, 'drone_pilot_ids', '')}
                                 className="rounded-full w-full"
                               >
                                  <Add01Icon className="h-4 w-4 mr-1" />
                                 Add Drone Pilot
                               </Button>
                             )}
                         </div>
                      )}

                      {/* Same Day Editor Section - Show only when quotation has same day editing enabled */}
                      {(() => {
                         // If we have a quotation, check if same day editing is enabled for this day
                         if (selectedQuotation) {
                           const quotationDetails = parseQuotationDetails(selectedQuotation.quotation_details as string);
                           return quotationDetails?.sameDayEditing || false;
                         }
                        
                         // For editing events with quotation data
                         if (currentEvent && (currentEvent as any)?.quotation_details) {
                           const quotationDetails = parseQuotationDetails((currentEvent as any).quotation_details);
                           return quotationDetails?.sameDayEditing || false;
                         }
                        
                        // For events without quotation, show if manually enabled
                        return extendedData.same_day_editor;
                      })() && (
                      <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <AdobePremierIcon className="h-4 w-4" />
                           Same Day Editor {quotationHasSameDayEditing && <span className="text-red-500">*</span>}
                         </Label>
                         
                          {/* Render same day editor fields - always show at least one when enabled */}
                          {(() => {
                            const editorIds = dayAssignment.same_day_editor_ids || [];
                            // If manually enabled but no slots exist, show one empty slot
                            const displayIds = editorIds.length > 0 ? editorIds : [''];
                            
                            return displayIds.map((editorId, index) => (
                             <div key={index} className="flex gap-2">
                                  <SearchableStaffSelect
                                    value={editorId}
                                     onValueChange={async (value) => {
                                       // Handle clear selection
                                       if (value === '__CLEAR__') {
                                         value = '';
                                       }
                                       
                                       // Check if this staff member is already assigned to same day editor role on this day
                                       if (value && value !== editorId) {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         const isAlreadyAssignedToSameRole = (currentDayAssignment?.same_day_editor_ids || []).includes(value);
                                         
                                         if (isAlreadyAssignedToSameRole) {
                                             const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                           alert(`${staffName} is already assigned as a same day editor on Day ${dayAssignment.day}.`);
                                           return;
                                         }
                                       }
                                       
                                       // Check for conflicts if assigning someone new
                                       if (value && value !== editorId && formData.event_date) {
                                         const person = allCombinedPeople.find(p => p.id === value);
                                         if (person) {
                                           await checkConflictsAndAssign(
                                             value,
                                             person.full_name,
                                             'Same Day Editor',
                                             dayAssignment.day,
                                             () => {
                                               // Update the assignment
                                               const currentIds = dayAssignment.same_day_editor_ids || [];
                                               const newIds = [...currentIds];
                                               
                                               // If this is a new slot (array was empty), initialize it
                                               if (currentIds.length === 0) {
                                                 newIds[0] = value;
                                               } else {
                                                 newIds[index] = value;
                                               }
                                               
                                               updateMultiDayAssignment(dayAssignment.day, 'same_day_editor_ids', newIds);
                                             }
                                           );
                                         }
                                       } else {
                                         // Direct assignment for clearing or no conflicts needed
                                         const currentIds = dayAssignment.same_day_editor_ids || [];
                                         const newIds = [...currentIds];
                                         
                                         // If this is a new slot (array was empty), initialize it
                                         if (currentIds.length === 0) {
                                           newIds[0] = value;
                                         } else {
                                           newIds[index] = value;
                                         }
                                         
                                         updateMultiDayAssignment(dayAssignment.day, 'same_day_editor_ids', newIds);
                                       }
                                   }}
                                     staffOptions={getAllStaffForRole('same_day_editor')
                                       .filter(person => {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         if (!currentDayAssignment) return true;
                                         // Allow current selection or staff not assigned to any role on this day
                                         return person.id === editorId ||
                                                (!(currentDayAssignment.photographer_ids || []).includes(person.id) &&
                                                  !(currentDayAssignment.cinematographer_ids || []).includes(person.id) &&
                                                   !(currentDayAssignment.drone_pilot_ids || []).includes(person.id) &&
                                                  !(currentDayAssignment.same_day_editor_ids || []).includes(person.id));
                                       })
                                       .map((person) => ({
                                         id: person.id,
                                         full_name: person.full_name,
                                         role: person.role
                                       }))}
                                    placeholder={`Select same day editor ${index + 1}`}
                                    
                                    className="rounded-full flex-1"
                                    allowClear={true}
                                    required={false}
                                 />
                                {/* Hide remove button in edit mode for events from quotations */}
                                {displayIds.length > 1 && !(currentEvent && isEventFromQuotation) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentIds = dayAssignment.same_day_editor_ids || [];
                                      const newIds = currentIds.filter((_, i) => i !== index);
                                      updateMultiDayAssignment(dayAssignment.day, 'same_day_editor_ids', newIds);
                                    }}
                                    className="p-2 h-9 w-9 rounded-full"
                                  >
                                    <Remove01Icon className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
                            ));
                          })()}
                         
                          {/* Add same day editor button - hide in edit mode for events from quotations */}
                          {(() => {
                            // For new events with quotation
                            if (!currentEvent && selectedQuotation) {
                              return true; // Allow adding for new events
                            }
                            
                            // For editing events with quotation data - don't allow adding more
                            if (currentEvent && (currentEvent as any)?.quotation_source_id) {
                              return false;
                            }
                            
                            // For events without quotation - allow adding
                            return !currentEvent || (!selectedQuotation && !(currentEvent as any)?.quotation_source_id);
                          })() && (
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               const newIds = [...dayAssignment.same_day_editor_ids, ''];
                               updateMultiDayAssignment(dayAssignment.day, 'same_day_editor_ids', newIds);
                             }}
                             className="rounded-full w-full"
                           >
                              <Add01Icon className="h-4 w-4 mr-1" />
                             Add Same Day Editor
                           </Button>
                         )}
                      </div>
                       )}

                      {/* Other Crew Section - Show only when enabled */}
                      {extendedData.other_crew_enabled && (
                      <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <UserGroupIcon className="h-4 w-4" />
                           Other Crew
                         </Label>
                         
                          {(dayAssignment.other_crew_ids || []).map((crewId, index) => (
                            <div key={index} className="flex gap-2">
                                 <SearchableStaffSelect
                                   value={crewId}
                                    onValueChange={async (value) => {
                                      // Handle clear selection
                                      if (value === '__CLEAR__') {
                                        value = '';
                                      }
                                      
                                      // Check if this staff member is already assigned to other crew role on this day
                                      if (value && value !== crewId) {
                                        const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                        const isAlreadyAssignedToSameRole = (currentDayAssignment?.other_crew_ids || []).includes(value);
                                        
                                        if (isAlreadyAssignedToSameRole) {
                                            const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                          alert(`${staffName} is already assigned as other crew on Day ${dayAssignment.day}.`);
                                          return;
                                        }
                                      }
                                      
                                      // Check for conflicts if assigning someone new
                                      if (value && value !== crewId && formData.event_date) {
                                        const person = allCombinedPeople.find(p => p.id === value);
                                        if (person) {
                                          await checkConflictsAndAssign(
                                            value,
                                            person.full_name,
                                            'Other',
                                            dayAssignment.day,
                                            () => {
                                              const currentIds = dayAssignment.other_crew_ids || [];
                                              const newIds = [...currentIds];
                                              newIds[index] = value;
                                              updateMultiDayAssignment(dayAssignment.day, 'other_crew_ids', newIds);
                                            }
                                          );
                                        }
                                      } else {
                                        // Direct assignment for clearing or no conflicts needed
                                        const currentIds = dayAssignment.other_crew_ids || [];
                                        const newIds = [...currentIds];
                                        newIds[index] = value;
                                        updateMultiDayAssignment(dayAssignment.day, 'other_crew_ids', newIds);
                                      }
                                    }}
                                   staffOptions={otherCrew
                                     .filter(person => {
                                       const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                       if (!currentDayAssignment) return true;
                                       // Allow current selection or staff not assigned to any role on this day
                                       return person.id === crewId ||
                                              (!(currentDayAssignment.photographer_ids || []).includes(person.id) &&
                                                !(currentDayAssignment.cinematographer_ids || []).includes(person.id) &&
                                                !(currentDayAssignment.drone_pilot_ids || []).includes(person.id) &&
                                                !(currentDayAssignment.same_day_editor_ids || []).includes(person.id) &&
                                                !(currentDayAssignment.other_crew_ids || []).includes(person.id));
                                     })
                                     .map((person) => ({
                                       id: person.id,
                                       full_name: person.full_name,
                                       role: person.role
                                     }))}
                                   placeholder={`Select crew member ${index + 1}`}
                                   className="rounded-full flex-1"
                                   allowClear={true}
                                />
                                {/* Remove button - hide in edit mode for events from quotations */}
                                {(dayAssignment.other_crew_ids || []).length > 1 && !(currentEvent && isEventFromQuotation) && (
                                 <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                    onClick={() => {
                                      const currentIds = dayAssignment.other_crew_ids || [];
                                      const newIds = currentIds.filter((_, i) => i !== index);
                                      updateMultiDayAssignment(dayAssignment.day, 'other_crew_ids', newIds);
                                    }}
                                   className="p-2 h-9 w-9 rounded-full"
                                 >
                                   <Remove01Icon className="h-4 w-4" />
                                 </Button>
                               )}
                           </div>
                         ))}
                         
                          {/* Add other crew button - hide in edit mode for events from quotations */}
                          {!(currentEvent && isEventFromQuotation) && (
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                              onClick={() => {
                                const currentIds = dayAssignment.other_crew_ids || [];
                                const newIds = [...currentIds, ''];
                                updateMultiDayAssignment(dayAssignment.day, 'other_crew_ids', newIds);
                              }}
                             className="rounded-full w-full"
                           >
                              <Add01Icon className="h-4 w-4 mr-1" />
                             Add Other Crew Member
                           </Button>
                         )}
                      </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-seondary-900 border-b pb-2">Additional Details</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description and additional notes"
                  rows={3}
                  className="resize-none h-20"
                />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-full">
              {loading ? 'Saving...' : currentEvent ? 'Update' : 'Create'}
            </Button>
          </div>
          
        </form>

        {/* Warning Dialogs */}
        <EnhancedWarningDialog
          open={showAdvanceWarning}
          onOpenChange={setShowAdvanceWarning}
          variant="warning"
          title="Advance Amount Warning"
          description={`The advance amount (₹${extendedData.advance_amount.toLocaleString()}) cannot be greater than the total bill amount (₹${formData.total_amount.toLocaleString()}). Please adjust the amounts before proceeding.`}
          confirmText="OK, I'll Fix It"
          onConfirm={() => {}}
        />

        <EnhancedWarningDialog
          open={showDuplicateEventWarning}
          onOpenChange={setShowDuplicateEventWarning}
          variant="info"
          title="Duplicate Event Type Detected"
          description={duplicateEventInfo ? `You already have a ${duplicateEventInfo.eventType} event for ${duplicateEventInfo.clientName}. Are you sure you want to create another ${duplicateEventInfo.eventType} event for the same client?` : ''}
          confirmText="Yes, Create Anyway"
          cancelText="No, Cancel"
          onConfirm={async () => {
            await processEventSubmission();
          }}
          onCancel={() => {
            setDuplicateEventInfo(null);
          }}
        />

        {/* Staff Assignment Conflict Dialog */}
        <StaffAssignmentConflictDialog
          open={conflictState.isOpen}
          onOpenChange={dismissConflictDialog}
          staffName={conflictState.staffName}
          role={conflictState.role}
          conflictingEvents={conflictState.conflictingEvents}
          onConfirm={conflictState.onConfirm}
          onCancel={dismissConflictDialog}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CleanEventFormDialog;
