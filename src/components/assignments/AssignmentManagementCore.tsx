import { useState, useMemo } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { useAssignments } from './hooks/useAssignments';
import { AssignmentManagementHeader } from './AssignmentManagementHeader';
import { AssignmentStatsCards } from './AssignmentStatsCards';
import { AssignmentContent } from './AssignmentContent';
import { SearchSortFilter } from '@/components/common/SearchSortFilter';
import { useSearchSortFilter } from '@/hooks/useSearchSortFilter';

const AssignmentManagementCore = () => {
  const {
    assignments,
    loading,
    isAdmin
  } = useAssignments();

  // Search, Sort & Filter
  const {
    searchValue,
    setSearchValue,
    currentSort,
    sortDirection,
    activeFilters,
    filteredAndSortedData: filteredAssignments,
    handleSortChange,
    handleSortDirectionToggle,
    handleFilterChange
  } = useSearchSortFilter({
    data: assignments,
    searchFields: ['event_title', 'client_name', 'venue'],
    defaultSort: 'day_date'
  });

  // Process assignments with event status filter
  const processedAssignments = useMemo(() => {
    let filtered = filteredAssignments;

    // Apply event status filter
    if (activeFilters.event_status) {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(assignment => {
        const eventDate = assignment.event_date;
        if (!eventDate) return true;
        
        switch (activeFilters.event_status) {
          case 'active': return eventDate >= today;
          case 'completed': return eventDate < today;
          default: return true;
        }
      });
    }

    return filtered;
  }, [filteredAssignments, activeFilters]);

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <AssignmentManagementHeader
        hasData={assignments.length > 0}
        assignments={assignments}
      />

      <AssignmentStatsCards assignments={assignments} />

      {/* Search, Sort & Filter */}
      <SearchSortFilter
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search assignments by event, client, venue..."
        sortOptions={[
          { key: 'day_date', label: 'Date' },
          { key: 'event_title', label: 'Event' },
          { key: 'client_name', label: 'Client' }
        ]}
        currentSort={currentSort}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onSortDirectionToggle={handleSortDirectionToggle}
        filterOptions={[
          {
            key: 'event_status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' }
            ]
          }
        ]}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      <AssignmentContent
        assignments={processedAssignments}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default AssignmentManagementCore;