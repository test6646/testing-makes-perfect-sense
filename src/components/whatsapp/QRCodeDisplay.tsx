
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCode: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrCode, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-center">
        <h4 className="text-base font-semibold mb-2">Scan QR Code</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Open WhatsApp → Settings → Linked Devices → Link Device
        </p>
        
        <Badge variant="outline" className="mb-4 flex items-center gap-1 w-fit mx-auto">
          <Timer className="w-3 h-3" />
          Scan within 60 seconds
        </Badge>
      </div>
      
      <div className="flex justify-center">
        <div className="p-3 bg-white rounded-xl border-2 shadow-lg w-full max-w-[280px]">
          <img 
            src={qrCode} 
            alt="WhatsApp QR Code" 
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Point your phone's camera at this QR code
        </p>
      </div>
    </div>
  );
};
