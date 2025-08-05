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

  // Get current session status - directly from backend
  const getStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_firm_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.current_firm_id) throw new Error('No firm selected');

      // Use firm_id as session_id for backend
      const sessionId = `firm_${profile.current_firm_id}_${Date.now()}`;

      // Direct backend call for status with timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`https://whatsapp-backend-fcx5.onrender.com/api/whatsapp/status/${sessionId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Session not found, that's normal for new sessions
          return setSession({ status: 'disconnected', message: 'Ready to connect', step: 1 });
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

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
      console.error('❌ Failed to get status:', error);
      setSession({ status: 'error', message: error.message, step: 1 });
    }
  }, []);

  // Initialize WhatsApp session - directly to backend
  const initialize = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSession(prev => ({ ...prev, status: 'connecting', message: 'Initializing session...', step: 2 }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_firm_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.current_firm_id) throw new Error('No firm selected');

      // Generate session ID based on firm
      const sessionId = `firm_${profile.current_firm_id}_${Date.now()}`;

      // Direct backend call for initialization with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for initialization

      const response = await fetch('https://whatsapp-backend-fcx5.onrender.com/api/whatsapp/initialize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
          firm_id: profile.current_firm_id
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();

      setSession({
        status: 'connecting',
        session_id: data.session_id,
        message: 'Session initialized - waiting for QR code...',
        step: 2
      });

      toast.success('Session initialized successfully!');
      
      // Start polling for status updates
      setTimeout(getStatus, 2000);
    } catch (error: any) {
      console.error('❌ Initialization failed:', error);
      const errorMessage = error.name === 'AbortError' 
        ? 'Request timeout. Backend might be starting up, please try again in a moment.'
        : error.message.includes('Failed to fetch')
        ? 'Cannot connect to WhatsApp backend. Please check your connection.'
        : error.message;
      
      setSession({ status: 'error', message: errorMessage, step: 1 });
      toast.error(`Initialization failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, getStatus]);

  // Disconnect WhatsApp session - directly to backend
  const disconnect = useCallback(async () => {
    try {
      if (!session.session_id) throw new Error('No active session to disconnect');

      // Direct backend call for disconnect
      const response = await fetch('https://whatsapp-backend-fcx5.onrender.com/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Disconnect failed');
      }

      setSession({ status: 'disconnected', message: 'WhatsApp disconnected', step: 1 });
      toast.success('WhatsApp disconnected successfully!');
      return true;
    } catch (error: any) {
      console.error('❌ Disconnect failed:', error);
      toast.error(`Disconnect failed: ${error.message}`);
      return false;
    }
  }, [session.session_id]);

  // Send test message - directly to backend
  const sendTestMessage = useCallback(async () => {
    if (session.status !== 'connected') {
      toast.error('WhatsApp not connected');
      return false;
    }

    if (!session.session_id) {
      toast.error('No active session');
      return false;
    }

    try {
      // Direct backend call for sending test message with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch('https://whatsapp-backend-fcx5.onrender.com/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: session.session_id,
          phone: '+919106403233',
          message: 'Test message from WhatsApp integration!'
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to send test message'}`);
      }

      const data = await response.json();
      console.log('✅ Test message sent:', data);
      
      toast.success('Test message sent successfully!');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send test message:', error);
      toast.error(`Failed to send test message: ${error.message}`);
      return false;
    }
  }, [session.status, session.session_id]);

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

  // Periodic status checks instead of real-time subscriptions
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;
    
    // Get initial status
    getStatus();

    // Poll for status updates when needed
    const startPolling = () => {
      if (session.status === 'connecting' || session.status === 'qr_ready') {
        pollInterval = setInterval(() => {
          if (isMounted) {
            getStatus();
          }
        }, 3000); // Poll every 3 seconds when actively connecting
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [getStatus, session.status]);

  return {
    session,
    isLoading,
    initialize,
    disconnect,
    sendTestMessage,
    refresh: getStatus
  };
};