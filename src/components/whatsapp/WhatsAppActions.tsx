
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Power, QrCode } from 'lucide-react';

interface WhatsAppActionsProps {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  isLoading: boolean;
  onInitialize: () => void;
  onSendTest: () => Promise<boolean>;
  onDisconnect: () => Promise<boolean>;
  onRefresh: () => void;
}

export const WhatsAppActions: React.FC<WhatsAppActionsProps> = ({
  status,
  isLoading,
  onInitialize,
  onSendTest,
  onDisconnect,
  onRefresh
}) => {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleSendTest = async () => {
    setIsSendingTest(true);
    await onSendTest();
    setIsSendingTest(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await onDisconnect();
    setIsDisconnecting(false);
  };

  // Connected state - show test and disconnect buttons
  if (status === 'connected') {
    return (
      <div className="space-y-2">
        <Button 
          onClick={handleSendTest} 
          disabled={isSendingTest} 
          className="w-full"
          size="lg"
        >
          {isSendingTest ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending Test...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Test Message
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="w-full"
        >
          {isDisconnecting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <Power className="w-4 h-4 mr-2" />
              Disconnect
            </>
          )}
        </Button>
      </div>
    );
  }

  // QR Ready or Connecting - show refresh button
  if (status === 'qr_ready' || status === 'connecting') {
    return (
      <Button variant="outline" onClick={onRefresh} className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh Status
      </Button>
    );
  }
  
  // Disconnected or Error - show initialize button
  return (
    <div className="space-y-2">
      <Button 
        onClick={onInitialize} 
        disabled={isLoading} 
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Initializing...
          </>
        ) : (
          <>
            <QrCode className="w-4 h-4 mr-2" />
            Initialize WhatsApp
          </>
        )}
      </Button>
      
      {status === 'error' && (
        <Button variant="outline" onClick={onRefresh} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};
