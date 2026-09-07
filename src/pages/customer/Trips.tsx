import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { TrustBadges } from '@/components/TrustBadges';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ClipboardList, QrCode, MapPin, Car, Calendar, Ticket } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  destination: string | null;
  fare: number | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  origin_rank_id: string | null;
  vehicle_id: string | null;
  ranks?: { name: string } | null;
  vehicles?: { plate: string; profiles?: { full_name: string } | null } | null;
}

export default function CustomerTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTrips();

    const channel = supabase
      .channel(`customer-trips-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          fetchTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        ranks:origin_rank_id (name),
        vehicles:vehicle_id (
          plate,
          profiles:driver_id (full_name)
        )
      `)
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
    } else {
      setTrips(data as Trip[] || []);
    }
    setLoading(false);
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-success';
      case 'in_progress': return 'border-l-primary';
      case 'assigned': return 'border-l-accent-foreground';
      case 'cancelled': return 'border-l-destructive';
      default: return 'border-l-warning';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Trips</h1>
            <p className="text-sm text-muted-foreground">View your trip history</p>
          </div>
        </div>

        {loading ? (
          <Card className="hover-lift">
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground">Loading trips...</p>
            </CardContent>
          </Card>
        ) : trips.length === 0 ? (
          <Card className="hover-lift">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No trips yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Book your first trip!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip, index) => (
              <Card 
                key={trip.id} 
                className={`border-l-4 ${getStatusColor(trip.status)} hover-lift animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{trip.destination || 'Unknown destination'}</span>
                      </div>
                      {trip.ranks && (
                        <p className="text-sm text-muted-foreground pl-10">
                          From: {trip.ranks.name}
                        </p>
                      )}
                      {trip.vehicles && (
                        <div className="flex items-center gap-2 text-sm pl-10">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span>{trip.vehicles.plate}</span>
                          {trip.vehicles.profiles && (
                            <span className="text-muted-foreground">
                              - {trip.vehicles.profiles.full_name}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-10">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(trip.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <StatusBadge status={trip.status} />
                      {trip.fare && (
                        <p className="font-bold text-xl text-gradient">R{trip.fare.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  
                  {(trip.status === 'pending' || trip.status === 'assigned') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-4 w-full">
                          <QrCode className="h-4 w-4 mr-2" />
                          Show Ticket
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass border-border/50">
                        <DialogHeader>
                          <DialogTitle>Trip Ticket</DialogTitle>
                        </DialogHeader>
                        <QRCodeDisplay
                          value={trip.id}
                          title={trip.destination || 'Trip'}
                          subtitle={`Fare: R${trip.fare?.toFixed(2) || '0.00'}`}
                          size={200}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Trust badges */}
        <TrustBadges />
      </div>
    </AppLayout>
  );
}
