
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  User, 
  MapPin, 
  CreditCard, 
  Download, 
  Send,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface PaymentInvoiceCardProps {
  event: {
    id: string;
    title: string;
    event_date: string;
    venue?: string;
    total_amount?: number;
    advance_amount?: number;
    balance_amount?: number;
    status: string;
    client?: {
      name: string;
      phone: string;
    };
    photographer?: {
      full_name: string;
    };
    videographer?: {
      full_name: string;
    };
  };
  onPaymentRecord?: () => void;
  onSendInvoice?: () => void;
  onDownloadInvoice?: () => void;
}

const PaymentInvoiceCard = ({ 
  event, 
  onPaymentRecord, 
  onSendInvoice, 
  onDownloadInvoice 
}: PaymentInvoiceCardProps) => {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Confirmed':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const balanceAmount = event.balance_amount || 0;
  const isFullyPaid = balanceAmount <= 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(event.event_date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(event.status)}
            <Badge className={getStatusColor(event.status)}>
              {event.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Client & Venue Info */}
        <div className="space-y-2">
          {event.client && (
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{event.client.name} - {event.client.phone}</span>
            </div>
          )}
          {event.venue && (
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.venue}</span>
            </div>
          )}
        </div>

        {/* Staff Assignment */}
        {(event.photographer || event.videographer) && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ASSIGNED STAFF</p>
            <div className="flex flex-wrap gap-2">
              {event.photographer && (
                <Badge variant="secondary" className="text-xs">
                  📸 {event.photographer.full_name}
                </Badge>
              )}
              {event.videographer && (
                <Badge variant="secondary" className="text-xs">
                  🎥 {event.videographer.full_name}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-md">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Bill</p>
            <p className="font-semibold">₹{event.total_amount?.toLocaleString() || '0'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="font-semibold text-green-600">₹{event.advance_amount?.toLocaleString() || '0'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`font-semibold ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
              ₹{balanceAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-center p-2 rounded-md bg-background border">
          <div className="flex items-center space-x-2">
            <CreditCard className={`h-4 w-4 ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`} />
            <span className={`text-sm font-medium ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
              {isFullyPaid ? 'Fully Paid' : 'Payment Pending'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!isFullyPaid && (
            <Button size="sm" onClick={onPaymentRecord} className="flex-1">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onSendInvoice}>
            <Send className="mr-1 h-3 w-3" />
            Send
          </Button>
          <Button size="sm" variant="outline" onClick={onDownloadInvoice}>
            <Download className="mr-1 h-3 w-3" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentInvoiceCard;
