
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWhatsAppSessionV2 } from '@/hooks/useWhatsAppSessionV2';
import { WhatsAppStatus } from './WhatsAppStatus';
import { QRCodeDisplay } from './QRCodeDisplay';
import { WhatsAppActions } from './WhatsAppActions';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const WhatsAppLinking = () => {
  const { 
    session, 
    isLoading, 
    initialize, 
    disconnect, 
    sendTestMessage, 
    refresh 
  } = useWhatsAppSessionV2();

  return (
    <div className="w-full max-w-md mx-auto space-y-4 p-4 sm:p-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">WhatsApp Integration</CardTitle>
          <CardDescription>
            Connect WhatsApp for automated notifications
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <WhatsAppStatus 
            status={session.status} 
            message={session.message} 
            step={session.step}
          />
        </CardContent>
      </Card>

      {/* QR Code Display - ONLY show when status is qr_ready AND we have a QR code */}
      {session.status === 'qr_ready' && session.qr_code && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <QRCodeDisplay qrCode={session.qr_code!} />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons Card */}
      <Card>
        <CardContent className="p-4">
          <WhatsAppActions
            status={session.status}
            isLoading={isLoading}
            onInitialize={initialize}
            onSendTest={sendTestMessage}
            onDisconnect={disconnect}
            onRefresh={refresh}
          />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>How it works:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Initialize WhatsApp connection</li>
                <li>Scan QR code with your phone</li>
                <li>Test the connection</li>
                <li>Automatically notify freelancers</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppLinking;
