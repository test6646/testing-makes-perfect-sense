import { useMemo } from 'react';
import { generateExpenseReportPDF } from '@/components/expenses/ExpenseReportPDF';
import { generateTaskReportPDF } from '@/components/tasks/TaskReportPDF';
import { generateSalaryReportPDF } from '@/components/salary/SalaryReportPDF';
import { generateEventReportPDF } from '@/components/events/EventReportPDF';
import { useGlobalExpenseStats } from './useGlobalExpenseStats';
import { useGlobalTaskStats } from './useGlobalTaskStats';
import { useGlobalEventStats } from './useGlobalEventStats';
import { useUniversalExportConfig } from './useUniversalExportConfig';

import { ExportConfig } from '@/components/common/UniversalExportDialog';
import { ExpenseCategory, TaskStatus } from '@/types/studio';

export const useExpenseExportConfig = (): ExportConfig => {
  const { expenses, loading } = useGlobalExpenseStats();
  
  return useUniversalExportConfig({
    entityName: 'expenses',
    title: 'Expense Report',
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateExpenseReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: loading ? data.length : expenses.length,
      summary: {
        'Total Amount': `₹${data.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}`
      }
    })
  });
};

export const useTaskExportConfig = (): ExportConfig => {
  const { tasks, loading } = useGlobalTaskStats();
  
  return useUniversalExportConfig({
    entityName: 'tasks',
    title: 'Task Report',
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateTaskReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: data.length,
      summary: {
        'Total Tasks': data.length.toString(),
        'Completed': data.filter((task: any) => task.status === 'Completed').length.toString(),
        'In Progress': data.filter((task: any) => task.status === 'In Progress').length.toString(),
        'Pending': data.filter((task: any) => task.status === 'Waiting for Response').length.toString()
      }
    })
  });
};

export const useEventExportConfig = (): ExportConfig => {
  const { events, loading } = useGlobalEventStats();
  
  return useUniversalExportConfig({
    entityName: 'events',
    title: 'Event Report',
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateEventReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => {
      const totalAmount = data.reduce((sum, event) => sum + (event.total_amount || 0), 0);
      const totalBalance = data.reduce((sum, event) => {
        const totalPaid = (event as any).payments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0;
        return sum + Math.max(0, (event.total_amount || 0) - totalPaid);
      }, 0);
      
      return {
        count: data.length,
        summary: {
          'Total Events': data.length.toString(),
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Amount Paid': `₹${(totalAmount - totalBalance).toLocaleString()}`,
          'Pending Balance': `₹${totalBalance.toLocaleString()}`
        }
      };
    }
  });
};

export const useQuotationExportConfig = (): ExportConfig => {
  return useUniversalExportConfig({
    entityName: 'quotations',
    title: 'Quotation Report',
    exportFunction: async (data, filterType, filterValue, firmData) => {
      // Import and call quotation PDF generator
      const { generateQuotationReportPDF } = await import('@/components/quotations/QuotationReportPDF');
      await generateQuotationReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => {
      const totalAmount = data.reduce((sum, quotation) => sum + (quotation.amount || 0), 0);
      const converted = data.filter((q: any) => q.converted_to_event).length;
      const pending = data.length - converted;
      
      return {
        count: data.length,
        summary: {
          'Total Quotations': data.length.toString(),
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Converted': converted.toString(),
          'Pending': pending.toString()
        }
      };
    }
  });
};

export const useSalaryExportConfig = (staffData: any[], freelancerData: any[], totalStats: any): ExportConfig => {
  return useMemo(() => {
    // Create dynamic additional filter types for individual staff and freelancers
    const additionalFilterTypes = [];

    // Add staff member filter type
    if (staffData.length > 0) {
      additionalFilterTypes.push({
        value: 'staff_member',
        label: 'By Staff Member',
        options: staffData.map(staff => ({ 
          value: staff.id, 
          label: staff.full_name 
        }))
      });
    }

    // Add freelancer member filter type  
    if (freelancerData.length > 0) {
      additionalFilterTypes.push({
        value: 'freelancer_member',
        label: 'By Freelancer',
        options: freelancerData.map(freelancer => ({ 
          value: freelancer.id, 
          label: freelancer.full_name 
        }))
      });
    }

    // Add role-based filter type
    const roleOptions = [];
    if (staffData.length > 0) roleOptions.push({ value: 'Staff', label: 'All Staff' });
    if (freelancerData.length > 0) roleOptions.push({ value: 'Freelancer', label: 'All Freelancers' });
    
    if (roleOptions.length > 0) {
      additionalFilterTypes.unshift({
        value: 'role_type',
        label: 'By Category',
        options: roleOptions
      });
    }

    // Use the standard universal export config approach with additional filters
    return useUniversalExportConfig({
      entityName: 'staff_salary',
      title: 'Salary & Payment Report',
      additionalFilterTypes,
      exportFunction: async (data, filterType, filterValue) => {
        let filteredStaffData = staffData;
        let filteredFreelancerData = freelancerData;
        let reportType: 'staff' | 'freelancers' | 'all' = 'all';

        // Apply filtering based on the filter config logic
        if (filterType === 'role_type') {
          if (filterValue === 'Staff') {
            reportType = 'staff';
            filteredFreelancerData = [];
          } else if (filterValue === 'Freelancer') {
            reportType = 'freelancers';
            filteredStaffData = [];
          }
        } else if (filterType === 'staff_member') {
          reportType = 'staff';
          filteredFreelancerData = [];
          filteredStaffData = staffData.filter(staff => staff.id === filterValue);
        } else if (filterType === 'freelancer_member') {
          reportType = 'freelancers';
          filteredStaffData = [];
          filteredFreelancerData = freelancerData.filter(freelancer => freelancer.id === filterValue);
        } else {
          // Handle standard role filters from the config
          const filteredStaff = [];
          const filteredFreelancers = [];
          
          // Apply role filters to staff data
          for (const staff of staffData) {
            if (filterType === 'role') {
              if ((filterValue === 'photographer' && staff.role === 'Photographer') ||
                  (filterValue === 'cinematographer' && staff.role === 'Cinematographer') ||
                  (filterValue === 'editor' && staff.role === 'Editor') ||
                  (filterValue === 'drone' && staff.role === 'Drone Pilot')) {
                filteredStaff.push(staff);
              }
            }
          }
          
          if (filteredStaff.length > 0) {
            filteredStaffData = filteredStaff;
            reportType = 'staff';
            filteredFreelancerData = [];
          } else if (filteredFreelancers.length > 0) {
            filteredFreelancerData = filteredFreelancers;
            reportType = 'freelancers';
            filteredStaffData = [];
          }
        }

        await generateSalaryReportPDF(filteredStaffData, filteredFreelancerData, reportType, totalStats);
      },
      getPreviewData: (data, filterType, selectedValue) => {
        let summaryData;
        let count;
        
        switch (filterType) {
          case 'role_type':
            if (selectedValue === 'Staff') {
              summaryData = {
                'Total Earned': `₹${staffData.reduce((sum, s) => sum + s.total_earnings, 0).toLocaleString()}`,
                'Total Paid': `₹${staffData.reduce((sum, s) => sum + s.paid_amount, 0).toLocaleString()}`,
                'Pending': `₹${staffData.reduce((sum, s) => sum + s.pending_amount, 0).toLocaleString()}`
              };
              count = staffData.length;
            } else if (selectedValue === 'Freelancer') {
              summaryData = {
                'Total Earned': `₹${freelancerData.reduce((sum, f) => sum + f.total_earnings, 0).toLocaleString()}`,
                'Total Paid': `₹${freelancerData.reduce((sum, f) => sum + f.paid_amount, 0).toLocaleString()}`,
                'Pending': `₹${freelancerData.reduce((sum, f) => sum + f.pending_amount, 0).toLocaleString()}`
              };
              count = freelancerData.length;
            } else {
              summaryData = {
                'Total Earned': `₹${totalStats?.totalEarnings?.toLocaleString() || '0'}`,
                'Total Paid': `₹${totalStats?.totalPaid?.toLocaleString() || '0'}`,
                'Pending': `₹${totalStats?.totalPending?.toLocaleString() || '0'}`
              };
              count = staffData.length + freelancerData.length;
            }
            break;
          case 'staff_member':
            const selectedStaff = staffData.find(s => s.id === selectedValue);
            if (selectedStaff) {
              summaryData = {
                'Total Earned': `₹${selectedStaff.total_earnings.toLocaleString()}`,
                'Total Paid': `₹${selectedStaff.paid_amount.toLocaleString()}`,
                'Pending': `₹${selectedStaff.pending_amount.toLocaleString()}`,
                'Total Tasks': selectedStaff.total_tasks.toString(),
                'Completed Tasks': selectedStaff.completed_tasks.toString()
              };
              count = 1;
            } else {
              summaryData = {};
              count = 0;
            }
            break;
          case 'freelancer_member':
            const selectedFreelancer = freelancerData.find(f => f.id === selectedValue);
            if (selectedFreelancer) {
              summaryData = {
                'Total Earned': `₹${selectedFreelancer.total_earnings.toLocaleString()}`,
                'Total Paid': `₹${selectedFreelancer.paid_amount.toLocaleString()}`,
                'Pending': `₹${selectedFreelancer.pending_amount.toLocaleString()}`,
                'Total Assignments': selectedFreelancer.total_assignments.toString()
              };
              count = 1;
            } else {
              summaryData = {};
              count = 0;
            }
            break;
          case 'role':
            // Handle role-based filtering for staff
            const roleFilteredStaff = staffData.filter(staff => {
              if (selectedValue === 'photographer') return staff.role === 'Photographer';
              if (selectedValue === 'cinematographer') return staff.role === 'Cinematographer';
              if (selectedValue === 'editor') return staff.role === 'Editor';
              if (selectedValue === 'drone') return staff.role === 'Drone Pilot';
              return false;
            });
            
            if (roleFilteredStaff.length > 0) {
              summaryData = {
                'Total Earned': `₹${roleFilteredStaff.reduce((sum, s) => sum + s.total_earnings, 0).toLocaleString()}`,
                'Total Paid': `₹${roleFilteredStaff.reduce((sum, s) => sum + s.paid_amount, 0).toLocaleString()}`,
                'Pending': `₹${roleFilteredStaff.reduce((sum, s) => sum + s.pending_amount, 0).toLocaleString()}`
              };
              count = roleFilteredStaff.length;
            } else {
              summaryData = {};
              count = 0;
            }
            break;
          case 'all':
          default:
            summaryData = {
              'Total Earned': `₹${totalStats?.totalEarnings?.toLocaleString() || '0'}`,
              'Total Paid': `₹${totalStats?.totalPaid?.toLocaleString() || '0'}`,
              'Pending': `₹${totalStats?.totalPending?.toLocaleString() || '0'}`
            };
            count = staffData.length + freelancerData.length;
            break;
        }

        return {
          count,
          summary: summaryData
        };
      }
    });
  }, [staffData, freelancerData, totalStats]);
};
