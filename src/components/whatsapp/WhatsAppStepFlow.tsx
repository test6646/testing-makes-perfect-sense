import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, QrCode, MessageSquare, RefreshCw, AlertCircle, Timer } from 'lucide-react';
import { useWhatsAppSessionV2 } from '@/hooks/useWhatsAppSessionV2';

const QRCodeDisplay: React.FC<{ qrCode: string }> = ({ qrCode }) => (
  <div className="space-y-4">
    <div className="text-center">
      <h4 className="text-lg font-semibold mb-2">Scan QR Code</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Open WhatsApp → Settings → Linked Devices → Link Device
      </p>
    </div>
    
    <div className="flex justify-center">
      <div className="p-4 bg-white rounded-lg border shadow-sm max-w-[280px]">
        <img 
          src={qrCode} 
          alt="WhatsApp QR Code" 
          className="w-full h-auto rounded"
        />
      </div>
    </div>
    
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        Point your phone's camera at this QR code to connect
      </p>
    </div>
  </div>
);

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'Initialize', icon: RefreshCw },
    { number: 2, title: 'QR Code', icon: QrCode },
    { number: 3, title: 'Scanning', icon: Timer },
    { number: 4, title: 'Connected', icon: CheckCircle }
  ];

  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep >= step.number;
        const isCurrent = currentStep === step.number;
        
        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2
                ${isActive 
                  ? isCurrent 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {isActive && !isCurrent ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs text-center font-medium px-1">{step.title}</span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 mx-3
                ${currentStep > step.number ? 'bg-success' : 'bg-muted'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const WhatsAppStepFlow = () => {
  const { 
    session, 
    isLoading, 
    initialize, 
    disconnect, 
    sendTestMessage, 
    refresh 
  } = useWhatsAppSessionV2();

  const [isSendingTest, setIsSendingTest] = React.useState(false);

  const handleSendTest = async () => {
    setIsSendingTest(true);
    await sendTestMessage();
    setIsSendingTest(false);
  };

  const getMainAction = () => {
    switch (session.step) {
      case 1: // Initialize
        return (
          <Button 
            onClick={initialize} 
            disabled={isLoading || session.status === 'connecting'} 
            className="w-full"
            size="lg"
          >
            {isLoading || session.status === 'connecting' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                {session.status === 'connecting' ? 'Setting up session...' : 'Initializing...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Initialize WhatsApp
              </>
            )}
          </Button>
        );

      case 2: // QR Ready - Show QR Code
        if (session.status === 'qr_ready' && session.qr_code) {
          return (
            <div className="space-y-4">
              <QRCodeDisplay qrCode={session.qr_code} />
              <Button variant="outline" onClick={refresh} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          );
        }
        
        // Still connecting
        return (
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <div>
                <h4 className="font-semibold">Setting up WhatsApp session...</h4>
                <p className="text-sm text-muted-foreground">Please wait while we prepare your QR code</p>
              </div>
            </div>
            <Button variant="outline" onClick={refresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </div>
        );

      case 3: // Scanning - QR Code is displayed and being scanned
        return (
          <div className="space-y-4">
            {session.qr_code && (
              <QRCodeDisplay qrCode={session.qr_code} />
            )}
            <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
              <Timer className="w-6 h-6 text-warning mx-auto mb-2 animate-pulse" />
              <h4 className="font-semibold text-warning">Waiting for scan...</h4>
              <p className="text-sm text-warning/80">
                Please scan the QR code with your WhatsApp
              </p>
            </div>
            <Button variant="outline" onClick={refresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Connection
            </Button>
          </div>
        );

      case 4: // Connected - Test Message
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
              <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
              <h4 className="font-semibold text-success">WhatsApp Connected!</h4>
              <p className="text-sm text-success/80">
                You can now send notifications to freelancers
              </p>
            </div>
            
            <Button 
              onClick={handleSendTest} 
              disabled={isSendingTest} 
              className="w-full"
              size="lg"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Test Message
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={disconnect} className="w-full">
              Disconnect WhatsApp
            </Button>
          </div>
        );

      default:
        return (
          <Button onClick={refresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Status
          </Button>
        );
    }
  };

  const getStatusCard = () => {
    if (session.status === 'error') {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <h4 className="font-semibold text-destructive">Connection Error</h4>
                <p className="text-sm text-destructive/80">
                  {session.message || 'Something went wrong. Please try again.'}
                </p>
              </div>
            </div>
            <Button onClick={refresh} variant="outline" className="w-full mt-3">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-center">
              WhatsApp Integration
            </CardTitle>
            <CardDescription className="text-center">
              Connect your WhatsApp for automated notifications
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Step Indicator */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <StepIndicator currentStep={session.step} />
          </CardContent>
        </Card>

        {/* Error Status */}
        {getStatusCard()}

        {/* Main Action Card */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            {getMainAction()}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>How it works:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click "Initialize WhatsApp" to start</li>
                <li>Scan the QR code with WhatsApp</li>
                <li>Send a test message to verify connection</li>
                <li>Automatically notify freelancers about tasks</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};