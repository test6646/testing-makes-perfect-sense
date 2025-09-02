
import { useState, useMemo } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Task } from '@/types/studio';
import { TaskFormDialog } from './TaskFormDialog';
import { useTaskExportConfig } from '@/hooks/useExportConfigs';
import { useTasks } from './hooks/useTasks';
import { TaskManagementHeader } from './TaskManagementHeader';
import { TaskStatsCards } from './TaskStatsCards';
import { TaskContent } from './TaskContent';
import { SearchSortFilter } from '@/components/common/SearchSortFilter';
import { useSearchSortFilter } from '@/hooks/useSearchSortFilter';

const TaskManagementCore = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    tasks,
    events,
    staffMembers,
    freelancers,
    loading,
    isAdmin,
    loadTasks,
    updateTaskStatus
  } = useTasks();

  const taskExportConfig = useTaskExportConfig(staffMembers);

  // Search, Sort & Filter
  const {
    searchValue,
    setSearchValue,
    currentSort,
    sortDirection,
    activeFilters,
    filteredAndSortedData: filteredTasks,
    handleSortChange,
    handleSortDirectionToggle,
    handleFilterChange
  } = useSearchSortFilter({
    data: tasks,
    searchFields: ['title', 'description'],
    defaultSort: 'due_date'
  });

  const handleTaskSuccess = async () => {
    await loadTasks();
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <TaskManagementHeader
        isAdmin={isAdmin}
        hasData={tasks.length > 0}
        exportConfig={taskExportConfig}
        tasks={tasks}
        onCreateTask={handleNewTask}
      />

      <TaskStatsCards tasks={tasks} />

      {/* Search, Sort & Filter */}
      <SearchSortFilter
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search tasks by title, description..."
        sortOptions={[
          { key: 'due_date', label: 'Deadline' },
          { key: 'priority', label: 'Priority' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created Date' }
        ]}
        currentSort={currentSort}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onSortDirectionToggle={handleSortDirectionToggle}
        filterOptions={[
          {
            key: 'task_status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'Waiting for Response', label: 'Waiting for Response' },
              { value: 'Accepted', label: 'Accepted' },
              { value: 'Declined', label: 'Declined' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Reported', label: 'Reported' }
            ]
          },
          {
            key: 'priority',
            label: 'Priority',
            type: 'select',
            options: [
              { value: 'Urgent', label: 'Urgent' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' }
            ]
          },
          {
            key: 'task_type',
            label: 'Category',
            type: 'select',
            options: [
              { value: 'Photo Editing', label: 'Photo Editing' },
              { value: 'Video Editing', label: 'Video Editing' },
              { value: 'Other', label: 'Other' }
            ]
          },
          {
            key: 'due_date',
            label: 'Due Date',
            type: 'date'
          }
        ]}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      <TaskContent
        tasks={filteredTasks}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onStatusChange={loadTasks}
        onUpdateTaskStatus={updateTaskStatus}
        onCreateTask={handleNewTask}
      />

      {isAdmin && (
        <TaskFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTask(null);
            }
          }}
          onSuccess={handleTaskSuccess}
          editingTask={editingTask}
          events={events}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};

export default TaskManagementCore;
