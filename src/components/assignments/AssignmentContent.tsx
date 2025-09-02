import { Assignment } from './hooks/useAssignments';
import { EmptyState } from '@/components/ui/empty-state';
import { Location01Icon, Calendar01Icon, UserIcon } from 'hugeicons-react';
import { Users } from 'lucide-react';
import CentralizedCard from '@/components/common/CentralizedCard';

interface AssignmentContentProps {
  assignments: Assignment[];
  isAdmin: boolean;
}

export const AssignmentContent = ({ assignments, isAdmin }: AssignmentContentProps) => {
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Assignments Found"
        description="No assignments match your current filters or you haven't been assigned to any events yet."
      />
    );
  }

  const formatAssignmentDate = (dayDate: string | null) => {
    if (!dayDate) return 'Date TBD';
    
    const date = new Date(dayDate);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {assignments.map((assignment) => {
        const metadata = [
          // Client name (always show)
          ...(assignment.client_name ? [{
            icon: <UserIcon className="h-4 w-4 text-primary" />,
            value: assignment.client_name
          }] : []),
          // Assignment date (always show)
          {
            icon: <Calendar01Icon className="h-4 w-4 text-primary" />,
            value: formatAssignmentDate(assignment.day_date),
            isDate: true
          },
          // Venue (always show)
          {
            icon: <Location01Icon className="h-4 w-4 text-primary" />,
            value: assignment.venue || '~'
          }
        ];

        return (
          <CentralizedCard
            key={assignment.id}
            title={assignment.event_title}
            badges={[]}
            metadata={metadata}
            actions={[]}
            className="rounded-2xl border border-border relative min-h-[400px]"
          >
            {/* Status indicator */}
            <div className="flex items-center justify-center pt-1">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                assignment.event_date && new Date(assignment.event_date) <= new Date()
                  ? 'bg-status-completed-bg text-status-completed border border-status-completed-border' 
                  : 'bg-status-pending-bg text-status-pending border border-status-pending-border'
              }`}>
                {assignment.event_date && new Date(assignment.event_date) <= new Date() ? 'COMPLETED' : 'UPCOMING'}
              </div>
            </div>

            {/* Assignment details */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-medium text-muted-foreground">{assignment.role?.toUpperCase()}</span>
              </div>
              {assignment.total_days && assignment.total_days > 1 && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                  <span className="text-xs font-medium text-muted-foreground">DAY {assignment.day_number}</span>
                </div>
              )}
            </div>
          </CentralizedCard>
        );
      })}
    </div>
  );
};