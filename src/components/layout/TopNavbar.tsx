
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  ClipboardList,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavbarProps {
  children: React.ReactNode;
}

const TopNavbar = ({ children }: TopNavbarProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">#Prit Photo</h2>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={cn(
                    "flex items-center space-x-2 h-9 px-3",
                    isActive(item.path) 
                      ? "bg-primary text-primary-foreground" 
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Right Side - User Menu & Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Add Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="hidden md:flex">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/events')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  New Event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/clients')}>
                  <Users className="mr-2 h-4 w-4" />
                  New Client
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/quotations')}>
                  <FileText className="mr-2 h-4 w-4" />
                  New Quotation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">
                      {profile?.full_name || 'User'}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {profile?.role || 'User'}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center space-x-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="w-full justify-start space-x-3 h-11"
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default TopNavbar;
