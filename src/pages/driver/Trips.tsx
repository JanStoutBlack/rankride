import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ClipboardList, User, MapPin, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  destination: string | null;
  fare: number | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  customer_id: string;
  profiles?: { full_name: string | null; phone: string } | null;
  ranks?: { name: string } | null;
}

export default function DriverTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicle, setVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTrip, setUpdatingTrip] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    fetchVehicleAndTrips().then((vehicleId) => {
      if (!vehicleId) return;
      channel = supabase
        .channel(`driver-trips-${vehicleId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips',
            filter: `vehicle_id=eq.${vehicleId}`,
          },
          () => {
            fetchTripsOnly(vehicleId);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);


  const fetchVehicleAndTrips = async (): Promise<string | null> => {
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, plate')
      .eq('driver_id', user?.id)
      .single();

    if (vehicleError || !vehicleData) {
      console.error('No vehicle assigned:', vehicleError);
      setLoading(false);
      return null;
    }

    setVehicle(vehicleData);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:customer_id (full_name, phone),
        ranks:origin_rank_id (name)
      `)
      .eq('vehicle_id', vehicleData.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
    } else {
      setTrips(tripsData as Trip[] || []);
    }

    setLoading(false);
    return vehicleData.id;
  };


  const fetchTripsOnly = async (vehicleId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:customer_id (full_name, phone),
        ranks:origin_rank_id (name)
      `)
      .eq('vehicle_id', vehicleId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setTrips(data as Trip[]);
    }
  };

  const updateTripStatus = async (tripId: string, newStatus: 'in_progress' | 'completed' | 'cancelled') => {
    setUpdatingTrip(tripId);
    
    const { error } = await supabase
      .from('trips')
      .update({ status: newStatus })
      .eq('id', tripId);

    if (error) {
      console.error('Error updating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to update trip status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Trip ${newStatus === 'in_progress' ? 'started' : newStatus}`,
      });
      
      if (newStatus === 'completed' && vehicle) {
        await supabase
          .from('vehicles')
          .update({ available_seats: 4 })
          .eq('id', vehicle.id);
      }
    }

    setUpdatingTrip(null);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="glass rounded-2xl p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!vehicle) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No vehicle assigned to you.</p>
              <p className="text-sm text-muted-foreground mt-1">Please contact the owner.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Today's Trips</h1>
              <p className="text-sm text-muted-foreground">Vehicle: {vehicle.plate}</p>
            </div>
          </div>
        </div>

        {trips.length === 0 ? (
          <Card className="hover-lift">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No trips assigned for today yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip, index) => (
              <Card 
                key={trip.id} 
                className="hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">
                          {trip.profiles?.full_name || 'Customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm pl-10">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{trip.destination || 'Unknown'}</span>
                      </div>
                      {trip.ranks && (
                        <p className="text-sm text-muted-foreground pl-10">
                          From: {trip.ranks.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground pl-10">
                        {format(new Date(trip.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <StatusBadge status={trip.status} />
                      {trip.fare && (
                        <p className="font-bold text-xl text-gradient">R{trip.fare.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {trip.status === 'assigned' && (
                      <Button
                        className="flex-1"
                        onClick={() => updateTripStatus(trip.id, 'in_progress')}
                        disabled={updatingTrip === trip.id}
                      >
                        {updatingTrip === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Start Trip
                      </Button>
                    )}
                    {trip.status === 'in_progress' && (
                      <Button
                        className="flex-1"
                        onClick={() => updateTripStatus(trip.id, 'completed')}
                        disabled={updatingTrip === trip.id}
                      >
                        {updatingTrip === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Complete Trip
                      </Button>
                    )}
                    {(trip.status === 'assigned' || trip.status === 'in_progress') && (
                      <Button
                        variant="outline"
                        onClick={() => updateTripStatus(trip.id, 'cancelled')}
                        disabled={updatingTrip === trip.id}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
