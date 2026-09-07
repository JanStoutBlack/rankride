import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Car, Plus, Wrench, Loader2 } from 'lucide-react';

interface Vehicle {
  id: string;
  plate: string;
  capacity: number;
  is_active: boolean;
  available_seats: number;
  rank_id: string | null;
  driver_id: string | null;
  ranks?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface Rank {
  id: string;
  name: string;
}

export default function OwnerVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [plate, setPlate] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [rankId, setRankId] = useState('');
  const [maintenanceDesc, setMaintenanceDesc] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [vehiclesRes, ranksRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select(`
          *,
          ranks:rank_id (name),
          profiles:driver_id (full_name)
        `)
        .order('plate'),
      supabase.from('ranks').select('id, name').order('name'),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
    if (ranksRes.data) setRanks(ranksRes.data);
    setLoading(false);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase
      .from('vehicles')
      .insert({
        plate: plate.toUpperCase(),
        capacity: parseInt(capacity),
        rank_id: rankId || null,
        available_seats: parseInt(capacity),
        is_active: true,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Vehicle added successfully',
      });
      setDialogOpen(false);
      setPlate('');
      setCapacity('4');
      setRankId('');
      fetchData();
    }

    setSubmitting(false);
  };

  const handleReportMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.functions.invoke('maintenance', {
      body: {
        vehicle_id: selectedVehicle.id,
        description: maintenanceDesc,
      },
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to report issue',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Maintenance issue reported',
      });
      setMaintenanceDialogOpen(false);
      setMaintenanceDesc('');
      setSelectedVehicle(null);
    }

    setSubmitting(false);
  };

  const toggleVehicleStatus = async (vehicle: Vehicle) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ is_active: !vehicle.is_active })
      .eq('id', vehicle.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vehicle status',
        variant: 'destructive',
      });
    } else {
      fetchData();
    }
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
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
              <p className="text-sm text-muted-foreground">Manage your fleet</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border/50">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">License Plate</Label>
                  <Input
                    id="plate"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="ABC 123 GP"
                    required
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Select value={capacity} onValueChange={setCapacity}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 7, 10, 14, 15].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} passengers
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rank">Assigned Rank</Label>
                  <Select value={rankId} onValueChange={setRankId}>
                    <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0">
                      <SelectValue placeholder="Select a rank" />
                    </SelectTrigger>
                    <SelectContent>
                      {ranks.map((rank) => (
                        <SelectItem key={rank.id} value={rank.id}>
                          {rank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Vehicle
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
            ) : vehicles.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No vehicles yet. Add your first vehicle.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Plate</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="hover:bg-secondary/30">
                        <TableCell className="font-medium">{vehicle.plate}</TableCell>
                        <TableCell>{vehicle.capacity}</TableCell>
                        <TableCell>{vehicle.ranks?.name || '-'}</TableCell>
                        <TableCell>{vehicle.profiles?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={vehicle.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleVehicleStatus(vehicle)}
                          >
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-warning/20"
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setMaintenanceDialogOpen(true);
                            }}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Dialog */}
        <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
          <DialogContent className="glass border-border/50">
            <DialogHeader>
              <DialogTitle>Report Issue - {selectedVehicle?.plate}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReportMaintenance} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Issue Description</Label>
                <Input
                  id="description"
                  value={maintenanceDesc}
                  onChange={(e) => setMaintenanceDesc(e.target.value)}
                  placeholder="Describe the issue..."
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Report Issue
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
