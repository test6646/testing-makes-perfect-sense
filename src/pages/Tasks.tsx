import NavigationLayout from '@/components/layout/NavigationLayout';
import TaskManagement from '@/components/tasks/TaskManagement';

const Tasks = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <TaskManagement />
      </div>
    </NavigationLayout>
  );
};

export default Tasks;