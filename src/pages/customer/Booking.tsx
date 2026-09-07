import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Navigation, Calculator, Loader2, CheckCircle2, Car, RefreshCw, Ticket, Sparkles } from 'lucide-react';

interface Rank {
  id: string;
  name: string;
  location: string;
}

interface BookingResult {
  tripId: string;
  fare: number;
  destination: string;
  vehiclePlate?: string;
  driverName?: string;
  assigned: boolean;
}

export default function CustomerBooking() {
  const { user } = useAuth();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [selectedRank, setSelectedRank] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState<number | null>(null);
  const [fareMethod, setFareMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    fetchRanks();
  }, []);

  const fetchRanks = async () => {
    const { data, error } = await supabase
      .from('ranks')
      .select('id, name, location')
      .order('name');

    if (error) {
      console.error('Error fetching ranks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load taxi ranks',
        variant: 'destructive',
      });
    } else {
      setRanks(data || []);
    }
  };

  const calculateFare = async () => {
    if (!selectedRank || !destination.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a rank and enter your destination',
        variant: 'destructive',
      });
      return;
    }

    setCalculatingFare(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-fare', {
        body: { rank_id: selectedRank, destination: destination.trim() },
      });

      if (error) throw error;

      setFare(data.fare);
      setFareMethod(data.method);
      toast({
        title: 'Fare Calculated',
        description: `Your fare is R${data.fare.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error calculating fare:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate fare',
        variant: 'destructive',
      });
    } finally {
      setCalculatingFare(false);
    }
  };

  const bookTrip = async () => {
    if (!selectedRank || !destination.trim() || fare === null || !user) {
      toast({
        title: 'Missing Information',
        description: 'Please complete all fields and calculate fare first',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          customer_id: user.id,
          origin_rank_id: selectedRank,
          destination: destination.trim(),
          fare: fare,
          status: 'pending',
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const { data: assignResult, error: assignError } = await supabase.functions.invoke('assign-trip', {
        body: { trip_id: trip.id },
      });

      if (assignError) {
        console.error('Assignment error:', assignError);
      }

      const result: BookingResult = {
        tripId: trip.id,
        fare: fare,
        destination: destination.trim(),
        assigned: assignResult?.assigned || false,
        vehiclePlate: assignResult?.plate,
        driverName: assignResult?.driver_name,
      };

      setBookingResult(result);
      toast({
        title: 'Trip Booked!',
        description: result.assigned 
          ? `Your taxi ${result.vehiclePlate} is ready!` 
          : 'Your booking is confirmed. Waiting for vehicle assignment.',
      });

    } catch (error) {
      console.error('Error booking trip:', error);
      toast({
        title: 'Booking Failed',
        description: 'Failed to book your trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setBookingResult(null);
    setSelectedRank('');
    setDestination('');
    setFare(null);
    setFareMethod('');
  };

  if (bookingResult) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="glass rounded-3xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 glow-success">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground mb-8">
              {bookingResult.assigned 
                ? 'Your vehicle has been assigned' 
                : 'Waiting for vehicle assignment'}
            </p>

            <div className="glass-subtle rounded-2xl p-6 mb-8 text-left space-y-4">
              <div className="flex items-start gap-3">
                <Navigation className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-semibold">{bookingResult.destination}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Ticket className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Fare</p>
                  <p className="font-semibold text-2xl">R{bookingResult.fare.toFixed(2)}</p>
                </div>
              </div>

              {bookingResult.vehiclePlate && (
                <div className="flex items-start gap-3">
                  <Car className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Vehicle</p>
                    <p className="font-semibold">{bookingResult.vehiclePlate}</p>
                    {bookingResult.driverName && (
                      <p className="text-sm text-muted-foreground">Driver: {bookingResult.driverName}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <StatusBadge status={bookingResult.assigned ? 'assigned' : 'pending'} />
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-4">Your Digital Ticket</p>
              <div className="inline-block glass-subtle rounded-2xl p-4">
                <QRCodeDisplay
                  value={bookingResult.tripId}
                  size={160}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Show this QR code to your driver
              </p>
            </div>

            <Button 
              onClick={resetBooking} 
              variant="outline" 
              className="w-full rounded-xl h-12 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Book Another Trip
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Quick & Easy Booking</span>
          </div>
          <h1 className="text-3xl font-bold">Book Your Trip</h1>
        </div>

        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Pickup Rank
            </Label>
            <Select value={selectedRank} onValueChange={setSelectedRank}>
              <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0">
                <SelectValue placeholder="Select your pickup location" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ranks.map((rank) => (
                  <SelectItem key={rank.id} value={rank.id} className="rounded-lg">
                    <span className="font-medium">{rank.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{rank.location}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Destination
            </Label>
            <Input
              placeholder="Where are you going?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-12 rounded-xl bg-secondary/50 border-0"
            />
          </div>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl gap-2"
            onClick={calculateFare}
            disabled={calculatingFare || !selectedRank || !destination.trim()}
          >
            {calculatingFare ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            Calculate Fare
          </Button>

          {fare !== null && (
            <div className="glass-subtle rounded-2xl p-6 text-center animate-scale-in">
              <p className="text-sm text-muted-foreground mb-1">Estimated Fare</p>
              <p className="text-4xl font-bold text-primary">R{fare.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">({fareMethod} rate)</p>
            </div>
          )}

          <Button
            className="w-full h-14 rounded-xl text-base font-medium gap-2 glow-primary"
            onClick={bookTrip}
            disabled={loading || fare === null}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Car className="h-5 w-5" />
            )}
            Book Trip
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
