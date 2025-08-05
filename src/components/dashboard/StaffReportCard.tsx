import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangleIcon, ClockIcon } from 'lucide-react';
import { Task } from '@/types/studio';

interface StaffReportCardProps {
  reportedTasks: Task[];
}

const StaffReportCard = ({ reportedTasks }: StaffReportCardProps) => {
  if (reportedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangleIcon className="h-5 w-5" />
          Task Reports ({reportedTasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reportedTasks.slice(0, 3).map((task) => (
          <div key={task.id} className="bg-white p-3 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-red-900">{task.title}</h4>
              <Badge variant="destructive" className="text-xs">
                Under Review
              </Badge>
            </div>
            {task.report_data && (
              <div className="space-y-1">
                <p className="text-xs text-red-700">
                  <strong>Reason:</strong> {task.report_data.reason}
                </p>
                {task.report_data.additional_notes && (
                  <p className="text-xs text-red-600">
                    <strong>Notes:</strong> {task.report_data.additional_notes}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-red-500 mt-2">
                  <ClockIcon className="h-3 w-3" />
                  Reported {new Date(task.report_data.reported_at).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ))}
        {reportedTasks.length > 3 && (
          <p className="text-xs text-red-600 text-center">
            +{reportedTasks.length - 3} more reported task{reportedTasks.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffReportCard;