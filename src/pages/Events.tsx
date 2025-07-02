import NavigationLayout from '@/components/layout/NavigationLayout';
import EventManagement from '@/components/events/EventManagement';

const Events = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <EventManagement />
      </div>
    </NavigationLayout>
  );
};

export default Events;