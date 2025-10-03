import React from 'react';
import StatCard from '@/components/ui/stat-card';
import { useGlobalSalaryStats } from '@/hooks/useGlobalSalaryStats';
import { 
  MoneyBag02Icon, 
  DollarCircleIcon, 
  UserIcon, 
  ChartBarLineIcon,
  Alert01Icon,
  Calendar01Icon
} from 'hugeicons-react';

interface SalaryStatsProps {
  stats: {
    totalStaff: number;
    totalFreelancers: number;
    taskPaymentsTotal: number;
    assignmentRatesTotal: number;
    totalPaid: number;
    totalPending: number;
    avgPerPerson: number;
    totalEarnings: number;
  } | null;
  loading: boolean;
  mode: 'staff' | 'freelancers' | 'mix';
}

import { StatsSkeleton } from '@/components/ui/skeleton';

const SalaryStats = ({ stats: _ignoredStats, loading: _ignoredLoading, mode }: SalaryStatsProps) => {
  // Use global salary stats hook to decouple from heavy datasets
  const { staffPayments, freelancerPayments, tasks, assignmentRates, totalStaffCount, totalFreelancerCount, loading } = useGlobalSalaryStats();

  if (loading) {
    return <StatsSkeleton />;
  }

  // Compute earnings and payments by mode
  const staffTaskEarnings = tasks
    .filter(t => t.assigned_to && t.status === 'Completed')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const freelancerTaskEarnings = tasks
    .filter(t => t.freelancer_id && t.status === 'Completed')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const staffAssignEarnings = assignmentRates
    .filter(a => a.staff_id)
    .reduce((sum, a) => sum + ((Number(a.rate) || 0) * (Number(a.quantity) || 0)), 0);

  const freelancerAssignEarnings = assignmentRates
    .filter(a => a.freelancer_id)
    .reduce((sum, a) => sum + ((Number(a.rate) || 0) * (Number(a.quantity) || 0)), 0);

  // Calculate Cash vs Digital breakdown for staff payments
  const staffCashPayments = staffPayments
    .filter(p => p.payment_method === 'Cash')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const staffDigitalPayments = staffPayments
    .filter(p => p.payment_method !== 'Cash')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const staffPaid = staffCashPayments + staffDigitalPayments;

  // Calculate Cash vs Digital breakdown for freelancer payments
  const freelancerCashPayments = freelancerPayments
    .filter(p => p.payment_method === 'Cash')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const freelancerDigitalPayments = freelancerPayments
    .filter(p => p.payment_method !== 'Cash')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const freelancerPaid = freelancerCashPayments + freelancerDigitalPayments;

  const staffEarnings = staffTaskEarnings + staffAssignEarnings;
  const freelancerEarnings = freelancerTaskEarnings + freelancerAssignEarnings;

  const mixEarnings = staffEarnings + freelancerEarnings;
  const mixPaid = staffPaid + freelancerPaid;
  const mixPending = Math.max(0, mixEarnings - mixPaid);

  // Calculate breakdown data for stats cards
  const getPaymentBreakdown = () => {
    if (mode === 'staff') {
      return { cash: staffCashPayments, digital: staffDigitalPayments };
    } else if (mode === 'freelancers') {
      return { cash: freelancerCashPayments, digital: freelancerDigitalPayments };
    } else {
      return { 
        cash: staffCashPayments + freelancerCashPayments, 
        digital: staffDigitalPayments + freelancerDigitalPayments 
      };
    }
  };

  const computed = mode === 'staff'
    ? {
        totalStaff: totalStaffCount,
        totalFreelancers: 0,
        taskPaymentsTotal: staffTaskEarnings,
        assignmentRatesTotal: staffAssignEarnings,
        totalPaid: staffPaid,
        totalPending: Math.max(0, staffEarnings - staffPaid),
        avgPerPerson: totalStaffCount > 0 ? staffEarnings / totalStaffCount : 0,
        totalEarnings: staffEarnings,
      }
    : mode === 'freelancers'
    ? {
        totalStaff: 0,
        totalFreelancers: totalFreelancerCount,
        taskPaymentsTotal: freelancerTaskEarnings,
        assignmentRatesTotal: freelancerAssignEarnings,
        totalPaid: freelancerPaid,
        totalPending: Math.max(0, freelancerEarnings - freelancerPaid),
        avgPerPerson: totalFreelancerCount > 0 ? freelancerEarnings / totalFreelancerCount : 0,
        totalEarnings: freelancerEarnings,
      }
    : {
        totalStaff: totalStaffCount,
        totalFreelancers: totalFreelancerCount,
        taskPaymentsTotal: staffTaskEarnings + freelancerTaskEarnings,
        assignmentRatesTotal: staffAssignEarnings + freelancerAssignEarnings,
        totalPaid: mixPaid,
        totalPending: mixPending,
        avgPerPerson: (totalStaffCount + totalFreelancerCount) > 0 ? mixEarnings / (totalStaffCount + totalFreelancerCount) : 0,
        totalEarnings: mixEarnings,
      };

  const paymentBreakdown = getPaymentBreakdown();

  return (
    <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
      <StatCard
        title="Total Earnings"
        value={`₹${(computed.totalEarnings || 0).toLocaleString()}`}
        icon={<MoneyBag02Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <StatCard
        title="Total Paid"
        value={`₹${(computed.totalPaid || 0).toLocaleString()}`}
        icon={<Calendar01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdown}
        breakdownType="payment"
      />
      <StatCard
        title="Payments"
        value={`₹${((computed.taskPaymentsTotal || 0) + (computed.assignmentRatesTotal || 0)).toLocaleString()}`}
        icon={<DollarCircleIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <StatCard
        title="Total Pending"
        value={`₹${(computed.totalPending || 0).toLocaleString()}`}
        icon={<Alert01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
    </div>
  );
};

export default SalaryStats;