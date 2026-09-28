import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { firebaseClient } from '@/integrations/firebase/client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Car, ClipboardCheck, LayoutDashboard, Plus, Sparkles, TrendingUp, Users, Wrench } from 'lucide-react';

interface DayMetric { date: string; trips: number; revenue: number }
interface Analytics {
  daily: DayMetric[]; totalTrips: number; completedTrips: number;
  activeVehicles: number; openMaintenance: number;
}
const emptyAnalytics: Analytics = { daily: [], totalTrips: 0, completedTrips: 0, activeVehicles: 0, openMaintenance: 0 };

export default function OwnerDashboard() {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    firebaseClient.functions.invoke('adminAnalytics').then(({ data }) => {
      if (data) setAnalytics(data as Analytics);
      setLoading(false);
    });
  }, []);

  const revenue = analytics.daily.reduce((sum, day) => sum + day.revenue, 0);
  const completion = analytics.totalTrips ? Math.round(analytics.completedTrips / analytics.totalTrips * 100) : 0;
  const cards = [
    { title: 'Trips this week', value: analytics.totalTrips, icon: ClipboardCheck },
    { title: 'Revenue this week', value: `R${revenue.toFixed(2)}`, icon: TrendingUp },
    { title: 'Active vehicles', value: analytics.activeVehicles, icon: Car },
    { title: 'Open issues', value: analytics.openMaintenance, icon: Wrench },
  ];
  const actions = [
    { to: '/admin/vehicles', icon: Car, label: 'Manage vehicles' },
    { to: '/admin/drivers', icon: Users, label: 'Add driver' },
    { to: '/admin/maintenance', icon: Wrench, label: 'View issues' },
    { to: '/admin/vehicles', icon: Plus, label: 'Add vehicle' },
  ];

  return <AppLayout>
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><LayoutDashboard className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Admin analytics</h1><p className="text-sm text-muted-foreground">A live seven-day view of the whole operation.</p></div>
        </div>
        <div className="glass-subtle rounded-xl px-4 py-2 text-sm"><span className="font-semibold text-primary">{completion}%</span> trip completion rate</div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ title, value, icon: Icon }) => <div key={title} className="glass rounded-2xl p-5 hover-lift">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
          <p className="text-2xl font-bold">{loading ? '—' : value}</p><p className="text-sm text-muted-foreground">{title}</p>
        </div>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="glass rounded-3xl p-5 sm:p-6" aria-label="Trips over the last seven days">
          <div className="mb-5"><h2 className="font-semibold">Trip activity</h2><p className="text-sm text-muted-foreground">Bookings and completed-trip revenue by day</p></div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.daily}>
              <defs><linearGradient id="tripFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'short' })} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
              <Tooltip contentStyle={{ borderRadius: 14, background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="trips" name="Trips" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#tripFill)" />
            </AreaChart></ResponsiveContainer>
          </div>
        </section>
        <section className="glass rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/><h2 className="font-semibold">Quick actions</h2></div>
          <div className="space-y-3">{actions.map(({ to, icon: Icon, label }) => <Link key={label} to={to} className="glass-subtle group flex items-center gap-3 rounded-2xl p-4 hover-lift">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary"/></span><span className="flex-1 text-sm font-medium">{label}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"/>
          </Link>)}</div>
        </section>
      </div>
    </div>
  </AppLayout>;
}
