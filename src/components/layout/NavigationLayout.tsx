import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  Settings, 
  LogOut,
  Camera,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationLayoutProps {
  children: React.ReactNode;
}

const NavigationLayout = ({ children }: NavigationLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', roles: ['Admin', 'Photographer', 'Videographer', 'Editor'] },
    { icon: Calendar, label: 'Events', path: '/events', roles: ['Admin', 'Photographer', 'Videographer'] },
    { icon: Users, label: 'Clients', path: '/clients', roles: ['Admin', 'Photographer', 'Videographer'] },
    { icon: ClipboardList, label: 'Tasks', path: '/tasks', roles: ['Admin', 'Photographer', 'Videographer', 'Editor'] },
    { icon: CreditCard, label: 'Payments', path: '/payments', roles: ['Admin'] },
    { icon: FileText, label: 'Quotations', path: '/quotations', roles: ['Admin', 'Photographer', 'Videographer'] },
    { icon: FileText, label: 'Event Sheet', path: '/sheet', roles: ['Admin', 'Photographer', 'Videographer'] },
    { icon: Users, label: 'Staff', path: '/staff', roles: ['Admin'] },
    { icon: TrendingUp, label: 'Expenses', path: '/expenses', roles: ['Admin'] },
    { icon: TrendingUp, label: 'Finance', path: '/finance', roles: ['Admin'] },
  ];

  const filteredItems = navigationItems.filter(item => 
    !profile || item.roles.includes(profile.role)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-background border-r border-sidebar-border">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">Studio Pro</h2>
              <p className="text-sm text-sidebar-foreground/70">Management System</p>
            </div>
          </div>

          <nav className="space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start space-x-3 h-11",
                    isActive(item.path) 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t border-sidebar-border">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <Badge variant="secondary" className="text-xs">
                {profile?.role || 'User'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default NavigationLayout;