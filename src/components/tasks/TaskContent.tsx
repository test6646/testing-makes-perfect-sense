import React from 'react';
import { CheckCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import TaskTableView from './TaskTableView';
import EnhancedTaskCardForStaff from './EnhancedTaskCardForStaff';
import { Task } from '@/types/studio';

interface TaskContentProps {
  tasks: Task[];
  isAdmin: boolean;
  onEdit: (task: Task) => void;
  onStatusChange: () => void;
  onUpdateTaskStatus: (taskId: string, status: any) => void;
  onCreateTask: () => void;
  onDelete: (taskId: string) => void;
  loading?: boolean;
  paginationLoading?: boolean;
}

export const TaskContent = React.memo(({
  tasks,
  isAdmin,
  onEdit,
  onStatusChange,
  onUpdateTaskStatus,
  onCreateTask,
  onDelete,
  loading = false,
  paginationLoading = false
}: TaskContentProps) => {
  if (tasks.length === 0 && !loading && !paginationLoading) {
    return (
      <EmptyState
        icon={CheckCircle}
        title={isAdmin ? 'No Tasks Yet' : 'No Tasks Assigned'}
        description={isAdmin 
          ? 'Start organizing your workflow by creating your first task.'
          : 'You have no tasks assigned to you at the moment.'
        }
        action={isAdmin ? {
          label: "Add Task",
          onClick: onCreateTask
        } : undefined}
      />
    );
  }

  if (isAdmin) {
    return (
      <TaskTableView 
        tasks={tasks} 
        onEdit={onEdit}
        onStatusChange={onStatusChange}
        onUpdateTaskStatus={onUpdateTaskStatus}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tasks.map((task) => (
        <EnhancedTaskCardForStaff
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
      ))}
    </div>
  );
});

TaskContent.displayName = 'TaskContent';