import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Car, 
  LogOut, 
  MapPin, 
  ClipboardList, 
  QrCode, 
  ScanLine,
  LayoutDashboard,
  Users,
  Wrench,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = {
  customer: [
    { path: '/customer/booking', label: 'Book Trip', icon: MapPin },
    { path: '/customer/trips', label: 'My Trips', icon: ClipboardList },
  ],
  driver: [
    { path: '/driver/trips', label: "Today's Trips", icon: ClipboardList },
    { path: '/driver/scan', label: 'Scan Ticket', icon: ScanLine },
    { path: '/driver/qr', label: 'My QR Code', icon: QrCode },
  ],
  owner: [
    { path: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/owner/vehicles', label: 'Vehicles', icon: Car },
    { path: '/owner/drivers', label: 'Drivers', icon: Users },
    { path: '/owner/maintenance', label: 'Maintenance', icon: Wrench },
  ],
};

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize real-time notifications
  useNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentNavItems = role ? navItems[role] : [];

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-subtle">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-lg hidden sm:block">TaxiRank</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 rounded-xl transition-all",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification indicator */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-secondary/50 relative"
              title="Notifications enabled"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
            </Button>

            {user && (
              <div className="hidden md:flex items-center gap-2">
                <div className="glass-subtle rounded-xl px-4 py-2">
                  <span className="text-sm font-medium">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut}
                  className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass animate-fade-in">
            <nav className="container py-4 space-y-2">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 rounded-xl h-12",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-3 px-4">
                  {profile?.full_name || user?.email}
                </p>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 rounded-xl h-12 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 container py-6">
        {children}
      </main>
    </div>
  );
}
