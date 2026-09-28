import {
  addDoc, collection, deleteDoc, doc, DocumentData, getDoc, getDocs,
  limit, onSnapshot, orderBy, query, QueryConstraint, serverTimestamp, Timestamp,
  setDoc, updateDoc, where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './config';

type Result<T = any> = { data: T | null; error: Error | null; count?: number | null };
type Filter = { field: string; op: '==' | '>=' | '<=' | 'in'; value: unknown };
type ChangeHandler = (payload: { new: DocumentData; old: DocumentData }) => void;

const relationMap: Record<string, Array<[string, string, string]>> = {
  trips: [['origin_rank_id', 'ranks', 'origin_rank'], ['vehicle_id', 'vehicles', 'vehicles'], ['customer_id', 'profiles', 'profiles']],
  vehicles: [['rank_id', 'ranks', 'ranks'], ['driver_id', 'profiles', 'profiles']],
  maintenance_logs: [['vehicle_id', 'vehicles', 'vehicles'], ['reported_by', 'profiles', 'profiles']],
};

async function hydrate(table: string, row: DocumentData) {
  const output = Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key, value instanceof Timestamp ? value.toDate().toISOString() : value,
  ]));
  await Promise.all((relationMap[table] || []).map(async ([field, target, alias]) => {
    if (!row[field]) return;
    const related = await getDoc(doc(db, target, row[field]));
    if (related.exists()) output[alias] = { id: related.id, ...related.data() };
  }));
  return output;
}

class FirestoreQuery implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private sort?: { field: string; ascending: boolean };
  private one: 'single' | 'maybe' | null = null;
  private write?: { type: 'insert' | 'update' | 'delete'; values?: DocumentData };
  private returnRows = false;
  private countOnly = false;

  constructor(private table: string) {}
  select(_fields = '*', options?: { count?: string; head?: boolean }) { this.returnRows = true; this.countOnly = Boolean(options?.head); return this; }
  eq(field: string, value: unknown) { this.filters.push({ field, op: '==', value }); return this; }
  is(field: string, value: unknown) { this.filters.push({ field, op: '==', value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ field, op: '>=', value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ field, op: '<=', value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, op: 'in', value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.sort = { field, ascending: options?.ascending !== false }; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  insert(values: DocumentData) { this.write = { type: 'insert', values }; return this; }
  update(values: DocumentData) { this.write = { type: 'update', values }; return this; }
  delete() { this.write = { type: 'delete' }; return this; }

  private constraints() {
    const constraints: QueryConstraint[] = this.filters.map(f => {
      const value = f.field.endsWith('_at') && typeof f.value === 'string' ? Timestamp.fromDate(new Date(f.value)) : f.value;
      return where(f.field, f.op, value);
    });
    if (this.sort) constraints.push(orderBy(this.sort.field, this.sort.ascending ? 'asc' : 'desc'));
    if (this.one) constraints.push(limit(1));
    return constraints;
  }

  private async execute(): Promise<Result> {
    try {
      if (this.write?.type === 'insert') {
        const values = { ...this.write.values, created_at: this.write.values?.created_at || serverTimestamp(), updated_at: serverTimestamp() };
        const ref = await addDoc(collection(db, this.table), values);
        const data = { id: ref.id, ...this.write.values };
        return { data: this.returnRows ? (this.one ? data : [data]) : data, error: null };
      }
      if (this.write) {
        const snapshot = await getDocs(query(collection(db, this.table), ...this.constraints()));
        await Promise.all(snapshot.docs.map(item => this.write?.type === 'delete'
          ? deleteDoc(item.ref)
          : updateDoc(item.ref, { ...this.write?.values, updated_at: serverTimestamp() })));
        return { data: null, error: null };
      }
      const snapshot = await getDocs(query(collection(db, this.table), ...this.constraints()));
      const rows = await Promise.all(snapshot.docs.map(item => hydrate(this.table, { id: item.id, ...item.data() })));
      if (this.countOnly) return { data: null, error: null, count: rows.length };
      if (this.one === 'single' && !rows[0]) return { data: null, error: new Error('Record not found') };
      return { data: this.one ? (rows[0] || null) : rows, error: null, count: rows.length };
    } catch (cause) {
      return { data: null, error: cause instanceof Error ? cause : new Error('Firebase request failed') };
    }
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class RealtimeChannel {
  private listener?: { table: string; filter?: string; callback: ChangeHandler };
  private unsubscribe?: () => void;
  constructor(public name: string) {}
  on(_event: string, config: { table: string; filter?: string; event?: string; schema?: string }, callback: ChangeHandler) { this.listener = { ...config, callback }; return this; }
  subscribe() {
    if (!this.listener) return this;
    const constraints: QueryConstraint[] = [];
    if (this.listener.filter) {
      const [field, expression] = this.listener.filter.split('=');
      const value = expression?.replace(/^eq\./, '');
      if (field && value) constraints.push(where(field, '==', value));
    }
    let initialized = false;
    this.unsubscribe = onSnapshot(query(collection(db, this.listener.table), ...constraints), snapshot => {
      if (!initialized) { initialized = true; return; }
      snapshot.docChanges().forEach(change => this.listener?.callback({ new: { id: change.doc.id, ...change.doc.data() }, old: {} }));
    });
    return this;
  }
  close() { this.unsubscribe?.(); }
}

export const firebaseClient = {
  from: (table: string) => new FirestoreQuery(table),
  channel: (name: string) => new RealtimeChannel(name),
  removeChannel: (channel: RealtimeChannel) => channel.close(),
  auth: { getSession: async () => ({ data: { session: auth.currentUser ? { user: auth.currentUser } : null } }) },
  functions: {
    invoke: async (name: string, options: { body?: unknown; method?: string } = {}) => {
      try {
        const callable = httpsCallable(functions, name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()));
        const response = await callable({ ...(options.body as object), method: options.method });
        return { data: response.data as any, error: null };
      } catch (cause) { return { data: null, error: cause instanceof Error ? cause : new Error('Cloud function failed') }; }
    },
  },
};

export { auth, db, doc, setDoc };
