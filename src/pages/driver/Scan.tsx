import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { QRScanner } from '@/components/QRScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { TrustBadges } from '@/components/TrustBadges';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScanLine, Check, X, Loader2, User, MapPin, Shield } from 'lucide-react';

interface ScannedTrip {
  id: string;
  destination: string | null;
  fare: number | null;
  status: string;
  customer_name: string | null;
  origin_rank: string | null;
  valid: boolean;
  error?: string;
}

export default function DriverScan() {
  const { user } = useAuth();
  const [scannedTrip, setScannedTrip] = useState<ScannedTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [boarding, setBoarding] = useState(false);

  const handleScan = async (tripId: string) => {
    setLoading(true);
    setScannedTrip(null);

    try {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('driver_id', user?.id)
        .single();

      if (vehicleError || !vehicle) {
        setScannedTrip({
          id: tripId,
          destination: null,
          fare: null,
          status: 'error',
          customer_name: null,
          origin_rank: null,
          valid: false,
          error: 'No vehicle assigned to you',
        });
        return;
      }

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          profiles:customer_id (full_name),
          ranks:origin_rank_id (name)
        `)
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        setScannedTrip({
          id: tripId,
          destination: null,
          fare: null,
          status: 'error',
          customer_name: null,
          origin_rank: null,
          valid: false,
          error: 'Trip not found',
        });
        return;
      }

      const isValid = trip.vehicle_id === vehicle.id && trip.status === 'assigned';
      const errorMessage = !isValid 
        ? trip.vehicle_id !== vehicle.id 
          ? 'This ticket is for a different vehicle'
          : 'This trip is not ready for boarding'
        : undefined;

      setScannedTrip({
        id: trip.id,
        destination: trip.destination,
        fare: trip.fare,
        status: trip.status,
        customer_name: (trip.profiles as any)?.full_name || 'Customer',
        origin_rank: (trip.ranks as any)?.name || 'Unknown',
        valid: isValid,
        error: errorMessage,
      });

      if (isValid) {
        toast({
          title: 'Valid Ticket',
          description: 'Passenger can board the vehicle',
        });
      } else {
        toast({
          title: 'Invalid Ticket',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error scanning ticket:', error);
      toast({
        title: 'Scan Error',
        description: 'Failed to verify ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const boardPassenger = async () => {
    if (!scannedTrip?.valid) return;

    setBoarding(true);
    
    const { error } = await supabase
      .from('trips')
      .update({ status: 'in_progress' })
      .eq('id', scannedTrip.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to board passenger',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Passenger Boarded',
        description: 'Trip is now in progress',
      });
      setScannedTrip(null);
    }

    setBoarding(false);
  };

  const resetScan = () => {
    setScannedTrip(null);
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-6 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scan Ticket</h1>
            <p className="text-sm text-muted-foreground">Verify passenger boarding</p>
          </div>
        </div>

        {loading ? (
          <Card className="hover-lift">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">Verifying ticket...</p>
            </CardContent>
          </Card>
        ) : scannedTrip ? (
          <Card className={`hover-lift animate-scale-in ${scannedTrip.valid ? 'border-success/50 glow-success' : 'border-destructive/50'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {scannedTrip.valid ? (
                  <div className="w-8 h-8 rounded-xl bg-success/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center">
                    <X className="h-5 w-5 text-destructive" />
                  </div>
                )}
                {scannedTrip.valid ? 'Valid Ticket' : 'Invalid Ticket'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scannedTrip.error ? (
                <p className="text-destructive bg-destructive/10 p-3 rounded-xl text-sm">{scannedTrip.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{scannedTrip.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span>{scannedTrip.destination}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/30">
                    <span className="text-muted-foreground">Fare:</span>
                    <span className="font-bold text-xl text-gradient">
                      R{scannedTrip.fare?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <StatusBadge status={scannedTrip.status as any} />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {scannedTrip.valid && (
                  <Button 
                    className="flex-1" 
                    onClick={boardPassenger}
                    disabled={boarding}
                  >
                    {boarding ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Board Passenger
                  </Button>
                )}
                <Button variant="outline" onClick={resetScan} className={scannedTrip.valid ? '' : 'flex-1'}>
                  Scan Another
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <QRScanner onScan={handleScan} />
            
            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Secure ticket verification</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
