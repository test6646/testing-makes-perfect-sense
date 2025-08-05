
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, QrCode, RefreshCw, AlertCircle } from 'lucide-react';

interface WhatsAppStatusProps {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  message?: string;
  step?: 1 | 2 | 3 | 4;
}

export const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({ status, message, step = 1 }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          badge: (
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ),
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          color: 'text-green-600'
        };
      case 'connecting':
        return {
          badge: (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Connecting
            </Badge>
          ),
          icon: <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />,
          color: 'text-blue-600'
        };
      case 'qr_ready':
        return {
          badge: (
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
              <QrCode className="w-3 h-3 mr-1" />
              QR Ready
            </Badge>
          ),
          icon: <QrCode className="w-5 h-5 text-orange-600" />,
          color: 'text-orange-600'
        };
      case 'error':
        return {
          badge: (
            <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
              <AlertCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          ),
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          color: 'text-red-600'
        };
      default:
        return {
          badge: (
            <Badge variant="outline">
              <X className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          ),
          icon: <X className="w-5 h-5 text-gray-500" />,
          color: 'text-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  const getStepText = () => {
    switch (step) {
      case 1: return "Step 1: Ready to Initialize";
      case 2: return "Step 2: Waiting for QR Code";
      case 3: return "Step 3: Scan QR Code";
      case 4: return "Step 4: Connected";
      default: return "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <div className="font-medium text-sm">WhatsApp Status</div>
            <div className="text-xs text-muted-foreground">
              {getStepText()}
            </div>
            {message && (
              <div className={`text-xs ${config.color} mt-1`}>
                {message}
              </div>
            )}
          </div>
        </div>
        {config.badge}
      </div>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-2">
        {[1, 2, 3, 4].map((stepNum) => (
          <div
            key={stepNum}
            className={`w-2 h-2 rounded-full transition-colors ${
              step >= stepNum 
                ? status === 'connected' && stepNum === 4
                  ? 'bg-green-500'
                  : status === 'qr_ready' && stepNum === 3
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
