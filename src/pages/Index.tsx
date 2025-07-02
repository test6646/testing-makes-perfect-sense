import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NavigationLayout from '@/components/layout/NavigationLayout';
import StudioDashboard from '@/components/layout/StudioDashboard';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If user is authenticated, show the dashboard
  if (!loading && user) {
    return (
      <NavigationLayout>
        <div className="p-6">
          <StudioDashboard />
        </div>
      </NavigationLayout>
    );
  }

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Professional Studio
              <span className="block text-primary">Management System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your photography business with our comprehensive management platform. 
              Handle events, tasks, payments, and team collaboration all in one place.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-primary">Event Management</CardTitle>
                <CardDescription>
                  Organize shoots, track progress, and manage client relationships seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-primary">Team Collaboration</CardTitle>
                <CardDescription>
                  Assign tasks, track deadlines, and keep your entire team synchronized
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
              <CardHeader>
                <CardTitle className="text-primary">Financial Tracking</CardTitle>
                <CardDescription>
                  Monitor payments, expenses, and generate professional reports automatically
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="space-y-6 mt-16">
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="px-8 py-6 text-lg"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-6 text-lg"
              >
                View Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Join thousands of photographers managing their studios efficiently
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
