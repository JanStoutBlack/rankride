import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Wrench, 
  TrendingUp,
  ClipboardList,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface Stats {
  totalTripsToday: number;
  totalRevenue: number;
  activeVehicles: number;
  openMaintenance: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTripsToday: 0,
    totalRevenue: 0,
    activeVehicles: 0,
    openMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: trips } = await supabase
      .from('trips')
      .select('fare, status')
      .gte('created_at', today.toISOString());

    const { count: vehicleCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: maintenanceCount } = await supabase
      .from('maintenance_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    const completedTrips = trips?.filter(t => t.status === 'completed') || [];
    const revenue = completedTrips.reduce((sum, t) => sum + (t.fare || 0), 0);

    setStats({
      totalTripsToday: trips?.length || 0,
      totalRevenue: revenue,
      activeVehicles: vehicleCount || 0,
      openMaintenance: maintenanceCount || 0,
    });

    setLoading(false);
  };

  const statCards = [
    {
      title: "Today's Trips",
      value: stats.totalTripsToday,
      icon: ClipboardList,
      gradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Revenue Today',
      value: `R${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Active Vehicles',
      value: stats.activeVehicles,
      icon: Car,
      gradient: 'from-violet-500/20 to-violet-600/10',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
    },
    {
      title: 'Open Issues',
      value: stats.openMaintenance,
      icon: Wrench,
      gradient: 'from-amber-500/20 to-amber-600/10',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
  ];

  const quickActions = [
    { to: '/owner/vehicles', icon: Car, label: 'Manage Vehicles' },
    { to: '/owner/drivers', icon: Users, label: 'Add Driver' },
    { to: '/owner/maintenance', icon: Wrench, label: 'View Issues' },
    { to: '/owner/vehicles', icon: Plus, label: 'Add Vehicle' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back! Here's your overview.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.title}
                className="glass rounded-2xl p-5 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={action.to}>
                  <div 
                    className="glass-subtle rounded-2xl p-6 text-center hover-lift cursor-pointer group animate-fade-in"
                    style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{action.label}</p>
                    <ArrowRight className="h-4 w-4 mx-auto mt-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
