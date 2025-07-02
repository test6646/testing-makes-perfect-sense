import NavigationLayout from '@/components/layout/NavigationLayout';
import FinanceManagement from '@/components/finance/FinanceManagement';

const Finance = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <FinanceManagement />
      </div>
    </NavigationLayout>
  );
};

export default Finance;