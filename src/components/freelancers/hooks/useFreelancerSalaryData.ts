import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Freelancer } from '@/types/freelancer';

interface FreelancerSalaryData {
  id: string;
  full_name: string;
  role: string;
  phone?: string;
  email?: string;
  total_assignments: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
}

interface FreelancerSalaryStats {
  totalFreelancers: number;
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  thisMonthPaid: number;
  avgEarningsPerFreelancer: number;
}

export const useFreelancerSalaryData = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [freelancerData, setFreelancerData] = useState<FreelancerSalaryData[]>([]);
  const [totalStats, setTotalStats] = useState<FreelancerSalaryStats>({
    totalFreelancers: 0,
    totalEarnings: 0,
    totalPaid: 0,
    totalPending: 0,
    thisMonthPaid: 0,
    avgEarningsPerFreelancer: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadFreelancerSalaryData = async () => {
    if (!profile?.current_firm_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all freelancers for the firm
      const { data: freelancers, error: freelancersError } = await supabase
        .from('freelancers')
        .select('*')
        .eq('firm_id', profile.current_firm_id);

      if (freelancersError) throw freelancersError;

      if (!freelancers || freelancers.length === 0) {
        setFreelancerData([]);
        setTotalStats({
          totalFreelancers: 0,
          totalEarnings: 0,
          totalPaid: 0,
          totalPending: 0,
          thisMonthPaid: 0,
          avgEarningsPerFreelancer: 0,
        });
        setLoading(false);
        return;
      }

      // Get all freelancer payments
      const { data: freelancerPayments, error: paymentsError } = await supabase
        .from('freelancer_payments')
        .select('freelancer_id, amount, payment_date')
        .eq('firm_id', profile.current_firm_id);

      if (paymentsError) throw paymentsError;

      // Calculate salary data for each freelancer
      const salaryData: FreelancerSalaryData[] = (freelancers as Freelancer[]).map(freelancer => {
        // Get payments for this freelancer
        const freelancerPaymentRecords = freelancerPayments?.filter(payment => payment.freelancer_id === freelancer.id) || [];
        const paidAmount = freelancerPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
        
        // For now, treat rate as potential earnings (this could be enhanced with actual assignment tracking)
        const totalEarnings = freelancer.rate || 0;
        const pendingAmount = Math.max(0, totalEarnings - paidAmount);

        return {
          id: freelancer.id,
          full_name: freelancer.full_name,
          role: freelancer.role,
          phone: freelancer.phone,
          email: freelancer.email,
          total_assignments: freelancerPaymentRecords.length, // Using payments as proxy for assignments
          total_earnings: totalEarnings,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
        };
      });

      setFreelancerData(salaryData);

      // Calculate overall statistics
      const totalFreelancers = salaryData.length;
      const totalEarnings = salaryData.reduce((sum, freelancer) => sum + freelancer.total_earnings, 0);
      const totalPaid = salaryData.reduce((sum, freelancer) => sum + freelancer.paid_amount, 0);
      const totalPending = salaryData.reduce((sum, freelancer) => sum + freelancer.pending_amount, 0);

      // Calculate this month's payments
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthPaid = freelancerPayments?.filter(payment => 
        new Date(payment.payment_date) >= thisMonthStart
      ).reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const avgEarningsPerFreelancer = totalFreelancers > 0 ? totalEarnings / totalFreelancers : 0;

      setTotalStats({
        totalFreelancers,
        totalEarnings,
        totalPaid,
        totalPending,
        thisMonthPaid,
        avgEarningsPerFreelancer,
      });

    } catch (error: any) {
      console.error('Error loading freelancer salary data:', error);
      toast({
        title: "Error loading freelancer salary data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFreelancerSalaryData();
  }, [profile?.current_firm_id]);

  return {
    freelancerData,
    totalStats,
    loading,
    refetch: loadFreelancerSalaryData,
  };
};