import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Bell, Car, ClipboardList, LayoutDashboard, LogOut, MapPin,
  QrCode, ScanLine, Users, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/roles';

interface AppLayoutProps { children: ReactNode }
type NavItem = { path: string; label: string; shortLabel: string; icon: typeof Car };

const riderNav: NavItem[] = [
  { path: '/customer/booking', label: 'Book a trip', shortLabel: 'Book', icon: MapPin },
  { path: '/customer/trips', label: 'My trips', shortLabel: 'Trips', icon: ClipboardList },
];
const driverNav: NavItem[] = [
  { path: '/driver/trips', label: "Today's trips", shortLabel: 'Trips', icon: ClipboardList },
  { path: '/driver/scan', label: 'Scan ticket', shortLabel: 'Scan', icon: ScanLine },
  { path: '/driver/qr', label: 'My QR code', shortLabel: 'My QR', icon: QrCode },
];
const adminNav: NavItem[] = [
  { path: '/owner/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { path: '/owner/vehicles', label: 'Vehicles', shortLabel: 'Vehicles', icon: Car },
  { path: '/owner/drivers', label: 'Drivers', shortLabel: 'Drivers', icon: Users },
  { path: '/owner/maintenance', label: 'Maintenance', shortLabel: 'Issues', icon: Wrench },
];
const navItems: Record<AppRole, NavItem[]> = {
  rider: riderNav, customer: riderNav, driver: driverNav,
  admin: adminNav, superadmin: adminNav, owner: adminNav,
};

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useNotifications();

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };
  const currentNavItems = role ? navItems[role] : [];

  return (
    <div className="min-h-screen gradient-mesh">
      <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5">
        <div className="neu-surface mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl px-3 sm:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="TaxiRank home">
            <span className="neu-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Car className="h-5 w-5 text-primary" /></span>
            <span className="hidden font-semibold tracking-tight sm:block">TaxiRank</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
            {currentNavItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return <Link key={path} to={path} className={cn('neu-nav-item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                <Icon className="h-4 w-4" /><span>{label}</span>
              </Link>;
            })}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="neu-icon rounded-xl" title="Notifications enabled"><Bell className="h-4 w-4" /><span className="sr-only">Notifications</span></Button>
            {user && <>
              <span className="hidden max-w-40 truncate px-2 text-sm font-medium lg:block">{profile?.full_name || user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="neu-icon rounded-xl hover:text-destructive" title="Sign out"><LogOut className="h-4 w-4" /><span className="sr-only">Sign out</span></Button>
            </>}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-8 lg:px-8">{children}</main>

      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden" aria-label="Mobile navigation">
        <div className="neu-surface mx-auto flex min-h-16 max-w-md items-stretch justify-around rounded-2xl p-1.5">
          {currentNavItems.map(({ path, shortLabel, icon: Icon }) => {
            const active = location.pathname === path;
            return <Link key={path} to={path} className={cn('mobile-nav-item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} /><span>{shortLabel}</span>
            </Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
