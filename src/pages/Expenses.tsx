import NavigationLayout from '@/components/layout/NavigationLayout';
import ExpenseManagement from '@/components/expenses/ExpenseManagement';

const Expenses = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <ExpenseManagement />
      </div>
    </NavigationLayout>
  );
};

export default Expenses;