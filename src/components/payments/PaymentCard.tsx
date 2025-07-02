import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  Download, 
  Share, 
  CreditCard, 
  DollarSign, 
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { Event, PaymentMethod } from '@/types/studio';
import QRCode from 'qrcode';
import React from 'react';

interface PaymentCardProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCollected: () => void;
}

const PaymentCard = ({ event, open, onOpenChange, onPaymentCollected }: PaymentCardProps) => {
  const { profile } = useAuth();
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { toast } = useToast();

  const balanceAmount = (event.total_amount || 0) - (event.advance_amount || 0);
  const paymentMethods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

  const generateQRCode = async () => {
    try {
      const paymentInfo = {
        eventTitle: event.title,
        clientName: event.client?.name,
        totalAmount: event.total_amount,
        balanceAmount: balanceAmount,
        eventDate: event.event_date,
        venue: event.venue
      };
      
      const qrText = `Payment for: ${paymentInfo.eventTitle}\nClient: ${paymentInfo.clientName}\nAmount: ₹${paymentInfo.balanceAmount}\nEvent Date: ${new Date(paymentInfo.eventDate).toLocaleDateString()}${paymentInfo.venue ? `\nVenue: ${paymentInfo.venue}` : ''}`;
      
      const qrDataUrl = await QRCode.toDataURL(qrText, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error generating QR code",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `payment-qr-${event.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "QR Code downloaded",
      description: "QR code has been saved to your device",
    });
  };

  const sharePaymentInfo = async () => {
    const paymentText = `Payment Request\n\nEvent: ${event.title}\nClient: ${event.client?.name}\nBalance Amount: ₹${balanceAmount.toLocaleString()}\nEvent Date: ${new Date(event.event_date).toLocaleDateString()}${event.venue ? `\nVenue: ${event.venue}` : ''}`;
    
    if (navigator.share) {
      try {
        if (qrCodeUrl) {
          // Convert data URL to blob for sharing
          const response = await fetch(qrCodeUrl);
          const blob = await response.blob();
          const file = new File([blob], `payment-qr-${event.title}.png`, { type: 'image/png' });
          
          await navigator.share({
            title: 'Payment Request',
            text: paymentText,
            files: [file]
          });
        } else {
          await navigator.share({
            title: 'Payment Request',
            text: paymentText
          });
        }
        
        toast({
          title: "Payment info shared",
          description: "Payment information has been shared",
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(paymentText);
        toast({
          title: "Copied to clipboard",
          description: "Payment information copied to clipboard",
        });
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await navigator.clipboard.writeText(paymentText);
      toast({
        title: "Copied to clipboard",
        description: "Payment information copied to clipboard",
      });
    }
  };

  const collectPayment = async () => {
    if (paymentAmount <= 0 || paymentAmount > balanceAmount) {
      toast({
        title: "Invalid amount",
        description: `Payment amount must be between ₹1 and ₹${balanceAmount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setCollectingPayment(true);
      
      const { error } = await supabase
        .from('payments')
        .insert({
          event_id: event.id,
          firm_id: profile?.firm_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: referenceNumber.trim() || null,
          created_by: profile?.id
        });

      if (error) throw error;

      toast({
        title: "Payment collected successfully!",
        description: `₹${paymentAmount.toLocaleString()} has been recorded for ${event.title}`,
      });

      setPaymentAmount(0);
      setReferenceNumber('');
      onPaymentCollected();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error collecting payment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCollectingPayment(false);
    }
  };

  const setFullBalance = () => {
    setPaymentAmount(balanceAmount);
  };

  const setHalfBalance = () => {
    setPaymentAmount(Math.round(balanceAmount / 2));
  };

  // Generate QR code when dialog opens
  React.useEffect(() => {
    if (open && balanceAmount > 0) {
      generateQRCode();
    }
  }, [open, balanceAmount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Collection
          </DialogTitle>
          <DialogDescription>
            Collect payment for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{event.title}</CardTitle>
              <CardDescription>Payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>{event.client?.name}</span>
                </div>
                <Badge variant="outline">{event.event_type}</Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.event_date).toLocaleDateString()}</span>
              </div>
              
              {event.venue && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{event.venue}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">₹{event.total_amount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Advance Paid:</span>
                  <span className="text-success">₹{event.advance_amount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Balance Amount:</span>
                  <span className="text-warning">₹{balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Section */}
          {qrCodeUrl && balanceAmount > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Payment QR Code
                </CardTitle>
                <CardDescription>
                  Share this QR code with the client for payment
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-48 h-48" />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={downloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={sharePaymentInfo}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Collection Section */}
          {balanceAmount > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Collect Payment
                </CardTitle>
                <CardDescription>
                  Record a payment received from the client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      placeholder="Enter amount"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      max={balanceAmount}
                    />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={setHalfBalance}
                      >
                        Half (₹{Math.round(balanceAmount / 2).toLocaleString()})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={setFullBalance}
                      >
                        Full (₹{balanceAmount.toLocaleString()})
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                  <Input
                    id="referenceNumber"
                    placeholder="Transaction ID, Cheque number, etc."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={collectPayment} 
                  disabled={collectingPayment || paymentAmount <= 0}
                  className="w-full"
                >
                  {collectingPayment ? 'Processing...' : `Collect ₹${paymentAmount.toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {balanceAmount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-success">Payment Complete</h3>
                <p className="text-muted-foreground text-center">
                  All payments have been collected for this event.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentCard;