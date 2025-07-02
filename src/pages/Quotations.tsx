import NavigationLayout from '@/components/layout/NavigationLayout';
import QuotationManagement from '@/components/quotations/QuotationManagement';

const Quotations = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <QuotationManagement />
      </div>
    </NavigationLayout>
  );
};

export default Quotations;