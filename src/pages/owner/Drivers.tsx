import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Plus, Loader2, User } from 'lucide-react';

interface Driver {
  id: string;
  full_name: string | null;
  phone: string;
  vehicle?: { plate: string } | null;
}

interface Vehicle {
  id: string;
  plate: string;
  driver_id: string | null;
}

export default function OwnerDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'driver');

    if (roleData && roleData.length > 0) {
      const driverIds = roleData.map(r => r.user_id);
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', driverIds);

      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('driver_id, plate')
        .in('driver_id', driverIds);

      const driversWithVehicles = profilesData?.map(profile => ({
        ...profile,
        vehicle: vehiclesData?.find(v => v.driver_id === profile.id) || null,
      })) || [];

      setDrivers(driversWithVehicles);
    }

    const { data: unassignedVehicles } = await supabase
      .from('vehicles')
      .select('id, plate, driver_id')
      .is('driver_id', null);

    setVehicles(unassignedVehicles || []);
    setLoading(false);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-driver', {
        body: {
          email,
          password,
          phone,
          full_name: fullName,
          vehicle_id: vehicleId || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Driver account created successfully',
        });
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error creating driver:', error);
      toast({
        title: 'Error',
        description: 'Failed to create driver account',
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setVehicleId('');
  };

  return (
    <AppLayout>
      <div className="space-y-6 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
              <p className="text-sm text-muted-foreground">Manage your team</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@example.com"
                    required
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 123 456 7890"
                    required
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Assign Vehicle (Optional)</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No vehicle</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Driver Account
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="hover-lift">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : drivers.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No drivers yet. Add your first driver.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Vehicle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.id} className="hover:bg-secondary/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            {driver.full_name || 'Unnamed'}
                          </div>
                        </TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>{driver.vehicle?.plate || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
