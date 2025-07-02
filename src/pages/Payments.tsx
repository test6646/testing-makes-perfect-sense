import NavigationLayout from '@/components/layout/NavigationLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const Payments = () => {
  return (
    <NavigationLayout>
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">Track and manage all payments</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payments Management</h3>
              <p className="text-muted-foreground">Payment tracking coming soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </NavigationLayout>
  );
};

export default Payments;