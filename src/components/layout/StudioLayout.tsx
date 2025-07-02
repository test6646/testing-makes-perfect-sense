import { ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  CheckSquare, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Receipt, 
  TrendingUp,
  Bell,
  Settings,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  profile: any;
  firms: any[];
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Sheet', href: '/sheet', icon: FileSpreadsheet },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Finance', href: '/finance', icon: TrendingUp },
];

const StudioLayout = ({ children, profile, firms }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleSignOut = async () => {
    // Logout logic handled in parent component
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-primary">#Prit</div>
              <span className="text-sm text-muted-foreground">photo</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Firm Status */}
            {profile?.role !== 'Admin' && firms.length === 0 && (
              <Badge variant="destructive">No firms available</Badge>
            )}
            
            {profile?.role === 'Admin' && (
              <Button size="sm" className="bg-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Firm
              </Button>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {profile?.full_name || user?.email}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Settings */}
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-md text-xs",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudioLayout;