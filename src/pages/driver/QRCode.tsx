import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QrCode, Loader2 } from 'lucide-react';

export default function DriverQRCode() {
  const { user, profile } = useAuth();
  const [vehicle, setVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVehicle();
    }
  }, [user]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate')
      .eq('driver_id', user?.id)
      .single();

    if (!error && data) {
      setVehicle(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!vehicle) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No vehicle assigned to you. Please contact the owner.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const qrValue = JSON.stringify({
    driver_id: user?.id,
    vehicle_id: vehicle.id,
    vehicle_plate: vehicle.plate,
  });

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My QR Code</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{profile?.full_name || 'Driver'}</CardTitle>
            <CardDescription>Vehicle: {vehicle.plate}</CardDescription>
          </CardHeader>
          <CardContent>
            <QRCodeDisplay
              value={qrValue}
              title="Payment QR Code"
              subtitle="Customers scan this to pay"
              size={220}
            />
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Show this QR code to customers at the end of their trip to receive payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}