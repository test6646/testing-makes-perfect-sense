import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import FreelancerFormDialog from './FreelancerFormDialog';
import FreelancerTableView from './FreelancerTableView';
import FreelancerStats from './FreelancerStats';
import { useFreelancers } from './hooks/useFreelancers';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';
import { FilteredManagementCore } from '@/components/common/FilteredManagementCore';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { UniversalPagination } from '@/components/common/UniversalPagination';

const FreelancerManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [refetchFn, setRefetchFn] = useState<(() => void) | null>(null);
  const { canCreateNew } = useSubscriptionAccess();
  
  // Initialize hook with refetch callback
  const { createFreelancer, updateFreelancer, deleteFreelancer, confirmDialog, setConfirmDialog } = useFreelancers(refetchFn || undefined);

  const handleAddNew = () => {
    setSelectedFreelancer(null);
    setDialogOpen(true);
  };

  const handleEdit = (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: FreelancerFormData) => {
    try {
      if (selectedFreelancer) {
        await updateFreelancer(selectedFreelancer.id, data);
      } else {
        await createFreelancer(data);
      }
      setDialogOpen(false);
      setSelectedFreelancer(null);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFreelancer(id);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
    <FilteredManagementCore
      pageType="freelancers"
      searchPlaceholder="Search freelancers by name, email, phone..."
      renderHeader={({ hasData }) => (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Freelancers</h1>
          <Button onClick={handleAddNew} className="rounded-full p-3" disabled={!canCreateNew}>
            <Add01Icon className="h-4 w-4" />
          </Button>
        </div>
      )}
      renderStats={() => (
        <FreelancerStats />
      )}
      renderContent={({ data, refetch, loadMore, allDataLoaded, currentPage, totalCount, filteredCount, pageSize, setPageSize, goToPage, loading, paginationLoading }) => {
        // Store refetch function for use in hooks
        if (refetch && !refetchFn) {
          setRefetchFn(() => refetch);
        }
        
        return (
          <>
            <FreelancerTableView
              freelancers={data}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAddNew}
              loading={loading}
              paginationLoading={paginationLoading}
            />
            
            <UniversalPagination
              currentPage={currentPage || 0}
              totalCount={totalCount || 0}
              filteredCount={filteredCount || 0}
              pageSize={pageSize || 50}
              allDataLoaded={allDataLoaded || false}
              loading={loading || paginationLoading || false}
              onLoadMore={loadMore || (() => {})}
              onPageChange={goToPage}
              showLoadMore={true}
              onPageSizeChange={setPageSize}
            />

            <FreelancerFormDialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setSelectedFreelancer(null);
                }
              }}
              freelancer={selectedFreelancer}
              onSubmit={handleSubmit}
            />
            
            <EnhancedConfirmationDialog
              open={confirmDialog.open}
              onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
              onConfirm={confirmDialog.onConfirm}
              title={confirmDialog.title}
              description={confirmDialog.description}
              variant={confirmDialog.variant}
              confirmText={confirmDialog.variant === 'destructive' ? 'Delete' : 'OK'}
              requireTextConfirmation={confirmDialog.requireTextConfirmation}
              confirmationKeyword={confirmDialog.confirmationKeyword}
              loading={confirmDialog.loading}
            />
          </>
        );
      }}
    />
  );
};

export default FreelancerManagement;
