import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();
const roles = ['rider', 'driver', 'admin', 'superadmin'] as const;
type Role = typeof roles[number];

function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please sign in first.');
  return request.auth;
}
function requireRole(request: Parameters<typeof requireAuth>[0], allowed: Role[]) {
  const auth = requireAuth(request);
  const role = (auth.token.role || 'rider') as Role;
  if (!allowed.includes(role)) throw new HttpsError('permission-denied', 'You do not have access to this action.');
  return auth;
}
function text(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpsError('invalid-argument', `${field} is required.`);
  return value.trim();
}

export const calculateFare = onCall(async request => {
  requireAuth(request);
  const rankId = text(request.data.rank_id, 'Rank');
  const destination = text(request.data.destination, 'Destination');
  const fares = await db.collection('fares').where('rank_id', '==', rankId).get();
  const match = fares.docs.find(item => String(item.data().destination).toLowerCase() === destination.toLowerCase());
  return { fare: match?.data().amount ?? Math.max(20, Math.round(destination.length * 2.5)), source: match ? 'preset' : 'estimate' };
});

export const assignTrip = onCall(async request => {
  const auth = requireRole(request, ['rider', 'admin', 'superadmin']);
  const tripId = text(request.data.trip_id, 'Trip');
  const tripRef = db.collection('trips').doc(tripId);
  return db.runTransaction(async transaction => {
    const trip = await transaction.get(tripRef);
    if (!trip.exists) throw new HttpsError('not-found', 'Trip not found.');
    const tripData = trip.data()!;
    if (auth.token.role === 'rider' || !auth.token.role) {
      if (tripData.customer_id !== auth.uid) throw new HttpsError('permission-denied', 'This is not your trip.');
    }
    const candidates = await db.collection('vehicles').where('rank_id', '==', tripData.origin_rank_id).where('is_active', '==', true).get();
    const available = candidates.docs.filter(vehicle => (vehicle.data().available_seats || 0) > 0)
      .sort((a, b) => Number(b.data().current_destination === tripData.destination) - Number(a.data().current_destination === tripData.destination))[0];
    if (!available) throw new HttpsError('failed-precondition', 'No vehicle currently has an available seat.');
    const current = await transaction.get(available.ref);
    const seats = current.data()?.available_seats || 0;
    if (seats < 1) throw new HttpsError('aborted', 'That vehicle just filled up. Please retry.');
    transaction.update(available.ref, { available_seats: seats - 1, updated_at: FieldValue.serverTimestamp() });
    transaction.update(tripRef, { vehicle_id: available.id, status: 'assigned', updated_at: FieldValue.serverTimestamp() });
    return { vehicle_id: available.id, plate: available.data().plate };
  });
});

export const maintenance = onCall(async request => {
  const auth = requireRole(request, ['driver', 'admin', 'superadmin']);
  if (request.data.method === 'PATCH') {
    requireRole(request, ['admin', 'superadmin']);
    const id = text(request.data.id, 'Issue');
    const status = text(request.data.status, 'Status');
    if (!['open', 'in_progress', 'resolved'].includes(status)) throw new HttpsError('invalid-argument', 'Invalid status.');
    await db.collection('maintenance_logs').doc(id).update({ status, updated_at: FieldValue.serverTimestamp() });
    return { id, status };
  }
  const vehicleId = text(request.data.vehicle_id, 'Vehicle');
  const description = text(request.data.description, 'Description');
  const ref = await db.collection('maintenance_logs').add({ vehicle_id: vehicleId, description, status: 'open', reported_by: auth.uid, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
  return { id: ref.id };
});

export const createDriver = onCall(async request => {
  requireRole(request, ['admin', 'superadmin']);
  const email = text(request.data.email, 'Email');
  const password = text(request.data.password, 'Password');
  const fullName = text(request.data.full_name, 'Name');
  const user = await getAuth().createUser({ email, password, displayName: fullName });
  await getAuth().setCustomUserClaims(user.uid, { role: 'driver' });
  await db.collection('profiles').doc(user.uid).set({ full_name: fullName, phone: String(request.data.phone || ''), created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
  if (request.data.vehicle_id) await db.collection('vehicles').doc(String(request.data.vehicle_id)).update({ driver_id: user.uid, updated_at: FieldValue.serverTimestamp() });
  return { user_id: user.uid };
});

export const listDrivers = onCall(async request => {
  requireRole(request, ['admin', 'superadmin']);
  const result = await getAuth().listUsers(1000);
  return { drivers: result.users.filter(user => user.customClaims?.role === 'driver').map(user => ({ user_id: user.uid })) };
});

export const manageUserRole = onCall(async request => {
  requireRole(request, ['superadmin']);
  const uid = text(request.data.uid, 'User');
  const role = text(request.data.role, 'Role') as Role;
  if (!roles.includes(role)) throw new HttpsError('invalid-argument', 'Invalid role.');
  await getAuth().setCustomUserClaims(uid, { role });
  return { uid, role };
});

export const adminAnalytics = onCall(async request => {
  requireRole(request, ['admin', 'superadmin']);
  const since = Timestamp.fromMillis(Date.now() - 6 * 86400000);
  const [trips, vehicles, maintenance] = await Promise.all([
    db.collection('trips').where('created_at', '>=', since).get(),
    db.collection('vehicles').get(), db.collection('maintenance_logs').where('status', '==', 'open').get(),
  ]);
  const daily = new Map<string, { date: string; trips: number; revenue: number }>();
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
    daily.set(date, { date, trips: 0, revenue: 0 });
  }
  let completed = 0;
  trips.forEach(item => {
    const data = item.data();
    const date = data.created_at?.toDate?.().toISOString().slice(0, 10);
    const day = daily.get(date);
    if (day) { day.trips++; if (data.status === 'completed') day.revenue += Number(data.fare || 0); }
    if (data.status === 'completed') completed++;
  });
  return {
    daily: [...daily.values()], totalTrips: trips.size, completedTrips: completed,
    activeVehicles: vehicles.docs.filter(item => item.data().is_active).length,
    openMaintenance: maintenance.size,
  };
});
