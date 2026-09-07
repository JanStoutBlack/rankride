import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface MaintenanceLog {
  id: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  vehicles?: { plate: string } | null;
}

export default function OwnerMaintenance() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    let query = supabase
      .from('maintenance_logs')
      .select(`
        *,
        vehicles:vehicle_id (plate)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data as MaintenanceLog[] || []);
    }
    setLoading(false);
  };

  const updateStatus = async (logId: string, newStatus: string) => {
    setUpdating(logId);

    const { error } = await supabase.functions.invoke('maintenance', {
      method: 'PATCH',
      body: { id: logId, status: newStatus },
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status updated',
      });
      fetchLogs();
    }

    setUpdating(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6 relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-warning/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
              <p className="text-sm text-muted-foreground">Track vehicle issues</p>
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-10 rounded-xl bg-secondary/50 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="hover-lift">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-success" />
                </div>
                <p className="text-muted-foreground">No maintenance issues found.</p>
                <p className="text-sm text-muted-foreground mt-1">All vehicles are in good condition!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-secondary/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            </div>
                            {log.vehicles?.plate || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={log.status}
                            onValueChange={(value) => updateStatus(log.id, value)}
                            disabled={updating === log.id}
                          >
                            <SelectTrigger className="w-32 h-9 rounded-lg bg-secondary/50 border-0">
                              {updating === log.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
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
