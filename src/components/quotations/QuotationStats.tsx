
import StatsGrid from '@/components/ui/stats-grid';
import { Note01Icon, HourglassIcon, AlertCircleIcon, MoneyBag02Icon } from 'hugeicons-react';
import { Quotation } from '@/types/studio';

// Helper function to check if quotation is expired
const isExpired = (validUntil: string | null) => {
  if (!validUntil) return false;
  const expiryDate = new Date(validUntil);
  const today = new Date();
  
  // Set both dates to midnight for date-only comparison
  expiryDate.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);
  
  return expiryDate < today;
};

interface QuotationStatsProps {
  quotations: Quotation[];
}

const QuotationStats = ({ quotations }: QuotationStatsProps) => {
  const activeQuotations = quotations.filter(q => !q.converted_to_event);
  const expiredQuotations = activeQuotations.filter(q => isExpired(q.valid_until));
  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.amount || 0), 0);
  const activeQuotationValue = activeQuotations.reduce((sum, q) => sum + (q.amount || 0), 0);

  return (
    <StatsGrid stats={[
      {
        title: "Active Quotations",
        value: activeQuotations.length,
        icon: <Note01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Pending",
        value: activeQuotations.filter(q => !isExpired(q.valid_until)).length,
        icon: <HourglassIcon className="h-4 w-4" />,
        colorClass: "bg-primary/15 text-primary"
      },
      {
        title: "Expired",
        value: expiredQuotations.length,
        icon: <AlertCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/25 text-primary"
      },
      {
        title: "Total Value",
        value: `₹${totalQuotationValue.toLocaleString()}`,
        icon: <MoneyBag02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/10 text-primary"
      }
    ]} />
  );
};

export default QuotationStats;
