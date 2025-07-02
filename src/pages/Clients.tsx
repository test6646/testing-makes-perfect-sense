import NavigationLayout from '@/components/layout/NavigationLayout';
import ClientManagement from '@/components/clients/ClientManagement';

const Clients = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <ClientManagement />
      </div>
    </NavigationLayout>
  );
};

export default Clients;