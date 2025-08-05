
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Integration</h1>
            <p className="text-muted-foreground text-sm">
              Connect WhatsApp for automated notifications
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    session.step >= step 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div 
                    className={`h-px w-8 mx-2 transition-colors ${
                      session.step > step ? 'bg-primary' : 'bg-muted'
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>

          {/* Status Card */}
          <Card className="border border-border/50">
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
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <QRCodeDisplay qrCode={session.qr_code!} />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card className="border border-border/50">
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
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">How it works:</p>
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">1</span>
                      Initialize WhatsApp connection
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">2</span>
                      Scan QR code with your phone
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">3</span>
                      Test the connection
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">4</span>
                      Automatically notify freelancers
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppLinking;
