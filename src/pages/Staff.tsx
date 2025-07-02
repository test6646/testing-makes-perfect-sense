import NavigationLayout from '@/components/layout/NavigationLayout';
import StaffManagement from '@/components/staff/StaffManagement';

const Staff = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <StaffManagement />
      </div>
    </NavigationLayout>
  );
};

export default Staff;