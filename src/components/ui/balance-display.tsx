import { cn } from '@/lib/utils';
import { calculateBalanceDisplayInfo } from '@/lib/payment-calculator';
import { MinusSignCircleIcon } from 'hugeicons-react';

interface EventFinancials {
  total_amount: number;
  advance_amount?: number;
  balance_amount?: number;
  payments?: { amount: number; payment_method?: string; }[];
  event_closing_balances?: { id: string; closing_amount: number; closing_reason?: string; }[];
}

interface BalanceDisplayProps {
  event: EventFinancials;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const BalanceDisplay = ({ event, className, showIcon = true, size = 'md' }: BalanceDisplayProps) => {
  // Debug: Log what we receive
  if ((event as any).total_amount === 115000) {
    console.log('💰 BalanceDisplay - 115k Event:', {
      total: event.total_amount,
      advance: event.advance_amount,
      closingBalances: event.event_closing_balances,
      closingBalancesType: Array.isArray(event.event_closing_balances) ? 'array' : typeof event.event_closing_balances
    });
  }
  
  const balanceInfo = calculateBalanceDisplayInfo(event);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (balanceInfo.isFullyClosed) {
    // Show original pending with strikethrough
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span className={cn("line-through text-destructive/70", sizeClasses[size])}>
          ₹{balanceInfo.originalPending.toLocaleString()}
        </span>
        {showIcon && (
          <MinusSignCircleIcon className="h-4 w-4 text-destructive/70" />
        )}
      </div>
    );
  }

  if (balanceInfo.isPartiallyClosed) {
    // Show effective pending with icon indicating reduction
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span className={sizeClasses[size]}>
          ₹{balanceInfo.effectivePending.toLocaleString()}
        </span>
        {showIcon && (
          <div title={`Reduced by ₹${balanceInfo.totalClosed.toLocaleString()} closure`}>
            <MinusSignCircleIcon className="h-4 w-4 text-orange-500" />
          </div>
        )}
      </div>
    );
  }

  // Normal pending amount
  return (
    <span className={cn(sizeClasses[size], className)}>
      ₹{balanceInfo.effectivePending.toLocaleString()}
    </span>
  );
};

export default BalanceDisplay;