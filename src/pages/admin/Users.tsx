import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { firebaseClient } from '@/integrations/firebase/client';
import type { AppRole } from '@/lib/roles';
import { Loader2, ShieldCheck, Users } from 'lucide-react';

interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  role: AppRole;
}

const roles: AppRole[] = ['rider', 'driver', 'admin', 'superadmin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadUsers = async () => {
    const { data, error } = await firebaseClient.functions.invoke('listUsers');
    if (error) toast({ title: 'Could not load users', description: error.message, variant: 'destructive' });
    else setUsers((data?.users || []) as ManagedUser[]);
    setLoading(false);
  };

  useEffect(() => { void loadUsers(); }, []);

  const changeRole = async (user: ManagedUser, role: AppRole) => {
    setUpdating(user.uid);
    const { error } = await firebaseClient.functions.invoke('manageUserRole', { body: { uid: user.uid, role } });
    if (error) toast({ title: 'Role update failed', description: error.message, variant: 'destructive' });
    else {
      setUsers(current => current.map(item => item.uid === user.uid ? { ...item, role } : item));
      toast({ title: 'Role updated', description: `${user.email || user.displayName} is now ${role}.` });
    }
    setUpdating(null);
  };

  return <AppLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><ShieldCheck className="h-6 w-6 text-primary" /></span>
        <div><h1 className="text-2xl font-bold">Users and roles</h1><p className="text-sm text-muted-foreground">Choose what each person can access.</p></div>
      </div>
      <div className="glass overflow-hidden rounded-3xl">
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading users</div> :
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead className="w-48">Role</TableHead></TableRow></TableHeader>
            <TableBody>{users.map(user => <TableRow key={user.uid}>
              <TableCell><div className="flex items-center gap-3"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{user.displayName || 'Unnamed user'}</p><p className="text-xs text-muted-foreground">{user.email || user.uid}</p></div></div></TableCell>
              <TableCell><Badge variant={user.disabled ? 'destructive' : 'secondary'}>{user.disabled ? 'Disabled' : 'Active'}</Badge></TableCell>
              <TableCell><Select value={user.role} onValueChange={value => void changeRole(user, value as AppRole)} disabled={updating === user.uid}>
                <SelectTrigger aria-label={`Role for ${user.email || user.uid}`}><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map(role => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent>
              </Select></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
      </div>
    </div>
  </AppLayout>;
}
