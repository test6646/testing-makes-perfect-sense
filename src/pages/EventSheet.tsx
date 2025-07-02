import NavigationLayout from '@/components/layout/NavigationLayout';
import EventSheetManagement from '@/components/eventsheet/EventSheetManagement';

const EventSheet = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <EventSheetManagement />
      </div>
    </NavigationLayout>
  );
};

export default EventSheet;