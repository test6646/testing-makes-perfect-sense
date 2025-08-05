import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppSessionState {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  qr_code?: string;
  session_id?: string;
  message?: string;
  connected_at?: string;
  step: 1 | 2 | 3 | 4; // 1: Initialize, 2: QR Ready, 3: Scanning, 4: Connected
}

export const useWhatsAppSessionV2 = () => {
  const [session, setSession] = useState<WhatsAppSessionState>({ 
    status: 'disconnected',
    step: 1 
  });
  const [isLoading, setIsLoading] = useState(false);
  // ✅ NO MORE POLLING - PURE REAL-TIME ONLY

  // ✅ REMOVED QR EXPIRY HANDLER - NO MORE TIMEOUTS

  // Get current session status
  const getStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-session-manager', {
        body: { action: 'status' }
      });

      if (error) {
        setSession({ status: 'error', message: error.message, step: 1 });
        return;
      }

      const newStep = data?.status === 'connected' ? 4 
                    : data?.status === 'qr_ready' ? (data?.qr_code ? 3 : 2)
                    : data?.status === 'connecting' ? 2
                    : 1;

      setSession({
        status: data?.status || 'disconnected',
        qr_code: data?.qr_code,
        session_id: data?.session_id,
        connected_at: data?.connected_at,
        message: getStatusMessage(data?.status),
        step: newStep
      });
    } catch (error: any) {
      setSession({ status: 'error', message: error.message, step: 1 });
    }
  }, []);

  // Initialize WhatsApp session
  const initialize = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSession(prev => ({ ...prev, status: 'connecting', message: 'Initializing session...', step: 2 }));

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-session-manager', {
        body: { action: 'initialize' }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Initialization failed');
      }

      setSession({
        status: 'connecting',
        session_id: data.session_id,
        message: 'Session initialized - waiting for QR code...',
        step: 2
      });

      toast.success('Session initialized successfully!');
    } catch (error: any) {
      setSession({ status: 'error', message: error.message, step: 1 });
      toast.error(`Initialization failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Disconnect WhatsApp session
  const disconnect = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-session-manager', {
        body: { action: 'disconnect' }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Disconnect failed');
      }

      setSession({ status: 'disconnected', message: 'WhatsApp disconnected', step: 1 });
      toast.success('WhatsApp disconnected successfully!');
      return true;
    } catch (error: any) {
      toast.error(`Disconnect failed: ${error.message}`);
      return false;
    }
  }, []);

  // Send test message
  const sendTestMessage = useCallback(async () => {
    if (session.status !== 'connected') {
      toast.error('WhatsApp not connected');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_firm_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.current_firm_id) throw new Error('No firm selected');

      const { error } = await supabase.functions.invoke('whatsapp-simple-messaging', {
        body: {
          firmId: profile.current_firm_id,
          phone: '+919106403233',
          message: 'Test message from WhatsApp integration!'
        }
      });

      if (error) throw new Error(error.message);
      
      toast.success('Test message sent!');
      return true;
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
      return false;
    }
  }, [session.status]);

  // Helper function for status messages
  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'connecting':
        return 'Connecting to WhatsApp...';
      case 'qr_ready':
        return 'QR Code ready! Scan with WhatsApp.';
      case 'connected':
        return 'WhatsApp connected successfully!';
      case 'error':
        return 'Connection error occurred';
      case 'disconnected':
        return 'WhatsApp not connected';
      default:
        return 'Ready to connect';
    }
  };

  // Real-time subscription for session updates
  useEffect(() => {
    let isMounted = true;
    
    // Get initial status
    getStatus();

    // Subscribe to real-time database updates ONLY
    const channel = supabase
      .channel('whatsapp-session-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions'
        },
        (payload) => {
          if (!isMounted) return; // Prevent updates if component unmounted
          
          console.log('📱 Real-time WhatsApp update:', payload);
          
          // Handle DELETE events (session removed)
          if (payload.eventType === 'DELETE') {
            setSession(prev => ({
              ...prev,
              status: 'disconnected',
              qr_code: undefined,
              session_id: undefined,
              connected_at: undefined,
              message: getStatusMessage('disconnected'),
              step: 1
            }));
            return;
          }
          
          // Handle INSERT/UPDATE events
          if (payload.new && typeof payload.new === 'object') {
            const sessionData = payload.new as Record<string, any>;
            const newStatus = sessionData.status || 'disconnected';
            
            const newStep = newStatus === 'connected' ? 4 
                          : newStatus === 'qr_ready' ? (sessionData.qr_code ? 3 : 2)
                          : newStatus === 'connecting' ? 2
                          : 1;
            
            setSession(prev => {
              // Only update if status actually changed to prevent flickering
              if (prev.status === newStatus && prev.qr_code === sessionData.qr_code) {
                return prev;
              }
              
              const updatedSession: WhatsAppSessionState = {
                status: newStatus,
                session_id: sessionData.session_id,
                qr_code: sessionData.qr_code,
                connected_at: sessionData.connected_at,
                message: getStatusMessage(newStatus),
                step: newStep as 1 | 2 | 3 | 4
              };
              
              // Status-specific notifications
              if (newStatus === 'connected' && prev.status !== 'connected') {
                toast.success('🎉 WhatsApp connected successfully!');
              } else if (newStatus === 'qr_ready' && prev.status !== 'qr_ready') {
                toast.info('📱 QR Code ready! Scan with WhatsApp');
              } else if (newStatus === 'connecting' && prev.status !== 'connecting') {
                toast.info('🔄 Initializing WhatsApp session...');
              } else if (newStatus === 'disconnected' && prev.status === 'connected') {
                toast.warning('📱 WhatsApp disconnected');
              } else if (newStatus === 'error') {
                toast.error(`❌ Connection error: ${sessionData.message || 'Unknown error'}`);
              }
              
              return updatedSession;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [getStatus]); // Add getStatus as dependency

  return {
    session,
    isLoading,
    initialize,
    disconnect,
    sendTestMessage,
    refresh: getStatus
  };
};