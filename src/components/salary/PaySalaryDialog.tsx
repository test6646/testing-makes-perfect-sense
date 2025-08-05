import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarCircleIcon, UserIcon, Calendar01Icon } from 'hugeicons-react';
import { PaymentMethod } from '@/types/studio';

interface PaySalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
  onSuccess: () => void;
}

const PaySalaryDialog = ({ open, onOpenChange, staff, onSuccess }: PaySalaryDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePaySalary = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!profile?.current_firm_id) {
      toast({
        title: "Error",
        description: "No firm selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (staff.is_freelancer) {
        // Create freelancer payment record
        const { error: paymentError } = await supabase
          .from('freelancer_payments')
          .insert({
            firm_id: profile.current_firm_id,
            freelancer_id: staff.id,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            description: description || `Payment to freelancer ${staff.full_name}`,
            created_by: profile.id,
          });

        if (paymentError) throw paymentError;
      } else {
        // Create staff payment record
        const { error: paymentError } = await supabase
          .from('staff_payments')
          .insert({
            firm_id: profile.current_firm_id,
            staff_id: staff.id,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            description: description || `Salary payment to ${staff.full_name}`,
            created_by: profile.id,
          });

        if (paymentError) throw paymentError;
      }

      // Create expense entry for salary payment
      try {
        const expenseDescription = staff.is_freelancer 
          ? `Freelancer payment to ${staff.full_name}`
          : `Salary payment to ${staff.full_name}`;

        const { error: expenseError } = await supabase
          .from('expenses')
          .insert({
            firm_id: profile.current_firm_id,
            category: 'Salary',
            description: expenseDescription,
            amount: parseFloat(amount),
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            notes: description || null,
            created_by: profile.id,
          });

        if (expenseError) {
          console.error('⚠️ Failed to create expense entry:', expenseError);
          // Don't throw here, just log - the salary payment should still succeed
        } else {
          console.log(`✅ Expense entry created for ${staff.full_name} salary payment`);
        }
      } catch (expenseCreationError) {
        console.error('⚠️ Error creating expense entry:', expenseCreationError);
        // Continue with the process even if expense creation fails
      }

      // Send Telegram notification if staff has telegram_chat_id
      if (staff.telegram_chat_id) {
        try {
          console.log('🔔 Sending salary payment notification to:', staff.full_name);
          
          const notificationMessage = `💰 *Salary Payment Received*

👤 *Staff:* ${staff.full_name}
💵 *Amount:* ₹${parseFloat(amount).toLocaleString()}
💳 *Payment Method:* ${paymentMethod}
📅 *Date:* ${new Date().toLocaleDateString()}
${description ? `📝 *Note:* ${description}` : ''}

Thank you for your excellent work! 🙏`;

          const { error: telegramError } = await supabase.functions.invoke('send-telegram-message', {
            body: {
              chat_id: staff.telegram_chat_id,
              message: notificationMessage,
              parse_mode: 'Markdown'
            }
          });
          
          if (telegramError) {
            console.error('❌ Failed to send salary notification:', telegramError);
          } else {
            console.log(`✅ Salary payment notification sent to ${staff.full_name}`);
          }
        } catch (telegramError) {
          console.error('Failed to send salary notification:', telegramError);
        }
      } else {
        console.log('⚠️ Staff member does not have telegram_chat_id configured:', staff);
      }

      toast({
        title: "Payment successful",
        description: `₹${parseFloat(amount).toLocaleString()} paid to ${staff.full_name}`,
      });

      onSuccess();
      setAmount('');
      setDescription('');
      setPaymentMethod('Cash');
    } catch (error: any) {
      console.error('Error processing salary payment:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Failed to process salary payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarCircleIcon className="h-5 w-5 mr-2" />
            Pay Salary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials(staff?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{staff?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{staff?.role}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Earned: ₹{staff?.total_earnings?.toLocaleString() || 0}
                    </Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Pending: ₹{staff?.pending_amount?.toLocaleString() || 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              
              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(staff?.pending_amount || 0)}
                  disabled={!staff?.pending_amount || staff.pending_amount <= 0}
                >
                  Full Pending (₹{staff?.pending_amount?.toLocaleString() || 0})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(5000)}
                >
                  ₹5,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(10000)}
                >
                  ₹10,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(15000)}
                >
                  ₹15,000
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note about this payment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaySalary} disabled={loading}>
              {loading ? 'Processing...' : `Pay ₹${amount || '0'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaySalaryDialog;