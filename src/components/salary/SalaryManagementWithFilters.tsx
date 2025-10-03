import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { UserIcon, UserGroupIcon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import SalaryStats from './SalaryStats';
import PaySalaryDialog from './PaySalaryDialog';
import SalaryHistoryDialog from './SalaryHistoryDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useSalaryExportConfig } from '@/hooks/useExportConfigs';
import EventAssignmentRatesDialog from './EventAssignmentRatesDialog';
import FreelancerDetailedReportDialog from './FreelancerDetailedReportDialog';
import StaffDetailedReportDialog from './StaffDetailedReportDialog';
import SalaryCardView from './SalaryCardView';
import { SalaryTableView } from './SalaryTableView';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { useGlobalSalaryStats } from '@/hooks/useGlobalSalaryStats';

const SalaryManagementWithFilters = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Core states
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any>(null);
  const [detailedReportOpen, setDetailedReportOpen] = useState(false);
  const [selectedForDetailedReport, setSelectedForDetailedReport] = useState<any>(null);
  const [staffDetailedReportOpen, setStaffDetailedReportOpen] = useState(false);
  const [selectedStaffForDetailedReport, setSelectedStaffForDetailedReport] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'staff' | 'freelancer'>('staff');

  // Backend filtering for staff (shows all staff with payment data)
  const staffSalaryFilters = useBackendFilters(FILTER_CONFIGS.staff_salary, {
    enableRealtime: true,
    pageSize: 50, // Standard UI pagination
    initialFilters: [] // No default filters
  });

  // Backend filtering for freelancers (shows all freelancers with payment data)
  const freelancerSalaryFilters = useBackendFilters(FILTER_CONFIGS.freelancer_salary, {
    enableRealtime: true,
    pageSize: 50 // Standard UI pagination
  });

  // Global stats for overall salary information
  const { 
    staffPayments, 
    freelancerPayments, 
    tasks, 
    assignmentRates, 
    totalStaffCount, 
    totalFreelancerCount, 
    loading: globalStatsLoading 
  } = useGlobalSalaryStats();

  // Current filter state based on view mode
  const currentFilterState = viewMode === 'staff' ? staffSalaryFilters : freelancerSalaryFilters;

  // Combined data transformation to match existing component expectations
  const transformedData = useMemo(() => {
    if (viewMode === 'staff') {
      // Transform staff with comprehensive salary data
      return staffSalaryFilters.data.map((staff: any) => {
        const payments = staff.staff_payments || [];
        const assignments = staff.event_staff_assignments || [];
        const assignmentRates = staff.event_assignment_rates || [];
        const tasks = staff.tasks_assigned || [];
        
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
        // Calculate task earnings (only completed tasks)
        const completedTasks = tasks.filter((task: any) => task.status === 'Completed');
        const taskEarnings = completedTasks.reduce((sum: number, task: any) => sum + (task.amount || 0), 0);
        
        // Calculate assignment earnings
        const assignmentEarnings = assignmentRates.reduce((sum: number, rate: any) => 
          sum + ((rate.rate || 0) * (rate.quantity || 0)), 0);
        
        const totalEarnings = taskEarnings + assignmentEarnings;
        const pendingAmount = Math.max(0, totalEarnings - totalPaid);
        
        return {
          id: staff.id,
          full_name: staff.full_name || 'Unknown',
          role: staff.role || 'Other',
          mobile_number: staff.mobile_number || null,
          type: 'staff',
          category: 'Staff',
          total_assignments: assignments.length,
          total_tasks: tasks.length,
          completed_tasks: completedTasks.length,
          task_earnings: taskEarnings,
          assignment_earnings: assignmentEarnings,
          total_earnings: totalEarnings,
          paid_amount: totalPaid,
          pending_amount: pendingAmount,
          payments,
          tasks,
          assignmentRates,
          assignments
        };
      });
    } else {
      // Transform freelancers with comprehensive salary data
      return freelancerSalaryFilters.data.map((freelancer: any) => {
        const payments = freelancer.freelancer_payments || [];
        const assignments = freelancer.event_staff_assignments || [];
        const assignmentRates = freelancer.event_assignment_rates || [];
        const tasks = freelancer.tasks_assigned || [];
        
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
        // Calculate task earnings (only completed tasks)
        const completedTasks = tasks.filter((task: any) => task.status === 'Completed');
        const taskEarnings = completedTasks.reduce((sum: number, task: any) => sum + (task.amount || 0), 0);
        
        // Calculate assignment earnings
        const assignmentEarnings = assignmentRates.reduce((sum: number, rate: any) => 
          sum + ((rate.rate || 0) * (rate.quantity || 0)), 0);
        
        const totalEarnings = taskEarnings + assignmentEarnings;
        const pendingAmount = Math.max(0, totalEarnings - totalPaid);
        
        return {
          id: freelancer.id,
          full_name: freelancer.full_name || 'Unknown',
          role: freelancer.role || 'Other',
          phone: freelancer.phone || null,
          email: freelancer.email || null,
          rate: freelancer.rate || 0,
          type: 'freelancer',
          category: 'Freelancer',
          is_freelancer: true, // Critical: Add this flag for PaySalaryDialog
          total_assignments: assignments.length,
          total_tasks: tasks.length,
          completed_tasks: completedTasks.length,
          task_earnings: taskEarnings,
          assignment_earnings: assignmentEarnings,
          total_earnings: totalEarnings,
          paid_amount: totalPaid,
          pending_amount: pendingAmount,
          payments,
          tasks,
          assignmentRates,
          assignments
        };
      });
    }
  }, [viewMode, staffSalaryFilters.data, freelancerSalaryFilters.data]);

  // Stats calculation based on transformed data for accuracy
  const combinedStats = useMemo(() => {
    const totalTaskEarnings = transformedData.reduce((sum, person) => sum + (person.task_earnings || 0), 0);
    const totalAssignmentEarnings = transformedData.reduce((sum, person) => sum + (person.assignment_earnings || 0), 0);
    const totalPaid = transformedData.reduce((sum, person) => sum + (person.paid_amount || 0), 0);
    const totalPending = transformedData.reduce((sum, person) => sum + (person.pending_amount || 0), 0);
    const totalEarnings = totalTaskEarnings + totalAssignmentEarnings;
    const personCount = transformedData.length;

    if (viewMode === 'staff') {
      return {
        totalStaff: personCount,
        totalFreelancers: 0,
        taskPaymentsTotal: totalTaskEarnings,
        assignmentRatesTotal: totalAssignmentEarnings,
        totalPaid: totalPaid,
        totalPending: totalPending,
        avgPerPerson: personCount > 0 ? totalEarnings / personCount : 0,
        totalEarnings: totalEarnings,
      };
    } else {
      return {
        totalStaff: 0,
        totalFreelancers: personCount,
        taskPaymentsTotal: totalTaskEarnings,
        assignmentRatesTotal: totalAssignmentEarnings,
        totalPaid: totalPaid,
        totalPending: totalPending,
        avgPerPerson: personCount > 0 ? totalEarnings / personCount : 0,
        totalEarnings: totalEarnings,
      };
    }
  }, [transformedData, viewMode]);

  const salaryExportConfig = useSalaryExportConfig(
    viewMode === 'staff' ? transformedData : [],
    viewMode === 'freelancer' ? transformedData : [],
    combinedStats
  );

  // Event handlers
  const handlePaySalary = (person: any) => {
    if ((person.pending_amount || 0) <= 0) {
      toast({
        title: "No pending amount",
        description: `${person.full_name} has no pending payments to process.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedStaff(person);
    setPayDialogOpen(true);
  };

  const handleViewHistory = (person: any) => {
    setSelectedStaff(person);
    setHistoryDialogOpen(true);
  };

  const handleViewDetailedReport = (person: any) => {
    if (person.type === 'freelancer') {
      setSelectedForDetailedReport(person);
      setDetailedReportOpen(true);
    } else {
      setSelectedStaffForDetailedReport(person);
      setStaffDetailedReportOpen(true);
    }
  };

  const handleAssignmentRates = (person: any) => {
    setSelectedForAssignment(person);
    setAssignmentDialogOpen(true);
  };

  const onPaymentSuccess = () => {
    currentFilterState.refetch();
    setPayDialogOpen(false);
  };

  const handleModeChange = (mode: 'staff' | 'freelancer') => {
    setViewMode(mode);
    // Reset pagination when switching modes
    if (mode === 'staff') {
      staffSalaryFilters.refetch();
    } else {
      freelancerSalaryFilters.refetch();
    }
  };

  if (currentFilterState.loading && currentFilterState.data.length === 0) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary</h1>
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-full border p-1">
            <Button
              variant={viewMode === 'staff' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('staff')}
              className="h-8 w-8 rounded-full p-0"
              title="Staff Payments"
            >
              <UserIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'freelancer' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('freelancer')}
              className="h-8 w-8 rounded-full p-0"
              title="Freelancer Payments"
            >
              <UserGroupIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {transformedData.length > 0 && (
            <UniversalExportDialog
              data={transformedData}
              config={salaryExportConfig}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <SalaryStats
        stats={combinedStats}
        loading={globalStatsLoading}
        mode={viewMode === 'freelancer' ? 'freelancers' : 'staff'}
      />

      {/* Universal Filter Bar */}
      <UniversalFilterBar
        searchValue={currentFilterState.searchTerm}
        onSearchChange={currentFilterState.setSearchTerm}
        onSearchApply={currentFilterState.handleSearchApply}
        onSearchClear={currentFilterState.handleSearchClear}
        isSearchActive={currentFilterState.isSearchActive}
        searchPlaceholder={`Search ${viewMode} payments...`}
        
        sortBy={currentFilterState.sortBy}
        sortOptions={viewMode === 'staff' ? FILTER_CONFIGS.staff_salary.sortOptions : FILTER_CONFIGS.freelancer_salary.sortOptions}
        onSortChange={currentFilterState.setSortBy}
        sortOrder={currentFilterState.sortOrder}
        onSortReverse={currentFilterState.toggleSortOrder}
        
        activeFilters={currentFilterState.activeFilters}
        filterOptions={viewMode === 'staff' ? FILTER_CONFIGS.staff_salary.filterOptions : FILTER_CONFIGS.freelancer_salary.filterOptions}
        onFiltersChange={currentFilterState.setActiveFilters}
        
        totalCount={currentFilterState.totalCount}
        filteredCount={currentFilterState.filteredCount}
        loading={currentFilterState.loading}
      />

      {/* Content */}
      <div className="space-y-6">
        {isMobile ? (
          <SalaryCardView
            data={transformedData}
            type="mixed"
            onPaySalary={handlePaySalary}
            onViewHistory={handleViewHistory}
            onAssignmentRates={handleAssignmentRates}
            onDetailedReport={handleViewDetailedReport}
            loading={currentFilterState.loading}
          />
        ) : (
          <SalaryTableView
            data={transformedData}
            type="mixed"
            onPaySalary={handlePaySalary}
            onViewHistory={handleViewHistory}
            onAssignmentRates={handleAssignmentRates}
            onDetailedReport={handleViewDetailedReport}
          />
        )}
      </div>

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={currentFilterState.currentPage}
        totalCount={currentFilterState.totalCount}
        filteredCount={currentFilterState.filteredCount}
        pageSize={currentFilterState.pageSize}
        allDataLoaded={currentFilterState.allDataLoaded}
        loading={currentFilterState.loading}
        onLoadMore={currentFilterState.loadMore}
        onPageChange={currentFilterState.goToPage}
        onPageSizeChange={currentFilterState.setPageSize}
        showLoadMore={true}
      />

      {/* Dialogs */}
      {payDialogOpen && (
        <PaySalaryDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          staff={selectedStaff}
          onSuccess={onPaymentSuccess}
        />
      )}

      {historyDialogOpen && (
        <SalaryHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          staff={selectedStaff}
        />
      )}

      {assignmentDialogOpen && (
        <EventAssignmentRatesDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          staff={selectedForAssignment}
          onSuccess={() => {
            currentFilterState.refetch();
          }}
        />
      )}

      {detailedReportOpen && (
        <FreelancerDetailedReportDialog
          open={detailedReportOpen}
          onOpenChange={setDetailedReportOpen}
          freelancer={selectedForDetailedReport}
        />
      )}

      {staffDetailedReportOpen && (
        <StaffDetailedReportDialog
          open={staffDetailedReportOpen}
          onOpenChange={setStaffDetailedReportOpen}
          staff={selectedStaffForDetailedReport}
        />
      )}
    </div>
  );
};

export default SalaryManagementWithFilters;