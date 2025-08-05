import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffSalaryData {
  id: string;
  full_name: string;
  mobile_number: string;
  role: string;
  telegram_chat_id?: string;
  total_tasks: number;
  completed_tasks: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
}

interface SalaryStats {
  totalStaff: number;
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  thisMonthPaid: number;
  avgEarningsPerStaff: number;
}

export const useSalaryData = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [staffData, setStaffData] = useState<StaffSalaryData[]>([]);
  const [totalStats, setTotalStats] = useState<SalaryStats>({
    totalStaff: 0,
    totalEarnings: 0,
    totalPaid: 0,
    totalPending: 0,
    thisMonthPaid: 0,
    avgEarningsPerStaff: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadSalaryData = async () => {
    if (!profile?.current_firm_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all staff members for the firm
      const { data: staffMembers, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, mobile_number, role')
        .eq('firm_id', profile.current_firm_id)
        .neq('role', 'Admin');

      if (staffError) throw staffError;

      if (!staffMembers || staffMembers.length === 0) {
        setStaffData([]);
        setTotalStats({
          totalStaff: 0,
          totalEarnings: 0,
          totalPaid: 0,
          totalPending: 0,
          thisMonthPaid: 0,
          avgEarningsPerStaff: 0,
        });
        setLoading(false);
        return;
      }

      // Get all tasks with amounts for staff members
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('assigned_to, status, amount')
        .eq('firm_id', profile.current_firm_id)
        .not('assigned_to', 'is', null)
        .not('amount', 'is', null);

      if (tasksError) throw tasksError;

      // Get all staff payments
      const { data: staffPayments, error: paymentsError } = await supabase
        .from('staff_payments')
        .select('staff_id, amount, payment_date')
        .eq('firm_id', profile.current_firm_id);

      if (paymentsError) throw paymentsError;

      // Calculate salary data for each staff member
      const salaryData: StaffSalaryData[] = staffMembers.map(staff => {
        // Get tasks assigned to this staff member
        const staffTasks = tasks?.filter(task => task.assigned_to === staff.id) || [];
        
        // Calculate task statistics
        const totalTasks = staffTasks.length;
        const completedTasks = staffTasks.filter(task => task.status === 'Completed').length;
        const totalEarnings = staffTasks.reduce((sum, task) => sum + (task.amount || 0), 0);

        // Calculate payments received
        const staffPaymentRecords = staffPayments?.filter(payment => payment.staff_id === staff.id) || [];
        const paidAmount = staffPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Calculate pending amount
        const pendingAmount = Math.max(0, totalEarnings - paidAmount);

        return {
          id: staff.id,
          full_name: staff.full_name,
          mobile_number: staff.mobile_number,
          role: staff.role,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          total_earnings: totalEarnings,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
        };
      });

      setStaffData(salaryData);

      // Calculate overall statistics
      const totalStaff = salaryData.length;
      const totalEarnings = salaryData.reduce((sum, staff) => sum + staff.total_earnings, 0);
      const totalPaid = salaryData.reduce((sum, staff) => sum + staff.paid_amount, 0);
      const totalPending = salaryData.reduce((sum, staff) => sum + staff.pending_amount, 0);

      // Calculate this month's payments
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthPaid = staffPayments?.filter(payment => 
        new Date(payment.payment_date) >= thisMonthStart
      ).reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const avgEarningsPerStaff = totalStaff > 0 ? totalEarnings / totalStaff : 0;

      setTotalStats({
        totalStaff,
        totalEarnings,
        totalPaid,
        totalPending,
        thisMonthPaid,
        avgEarningsPerStaff,
      });

    } catch (error: any) {
      console.error('Error loading salary data:', error);
      toast({
        title: "Error loading salary data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaryData();
  }, [profile?.current_firm_id]);

  return {
    staffData,
    totalStats,
    loading,
    refetch: loadSalaryData,
  };
};