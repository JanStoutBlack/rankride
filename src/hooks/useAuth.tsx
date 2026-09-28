import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  GoogleAuthProvider, User, createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/config';
import type { AppRole } from '@/lib/roles';

interface Profile { id: string; phone: string; full_name: string | null }
type AppUser = User & { id: string };
interface AuthContextType {
  user: AppUser | null;
  session: { user: AppUser } | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { full_name: string; phone: string; role: AppRole }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async currentUser => {
    setUser(currentUser ? Object.assign(currentUser, { id: currentUser.uid }) : null);
    setProfile(null);
    setRole(null);
    if (currentUser) {
      try {
        const [roleSnapshot, profileSnapshot] = await Promise.all([
          getDoc(doc(db, 'user_roles', currentUser.uid)),
          getDoc(doc(db, 'profiles', currentUser.uid)),
        ]);
        const storedRole = roleSnapshot.data()?.role;
        setRole(typeof storedRole === 'string' ? storedRole as AppRole : 'rider');
        if (profileSnapshot.exists()) setProfile({ id: currentUser.uid, ...profileSnapshot.data() } as Profile);
      } catch {
        setRole('rider');
      }
    }
    setLoading(false);
  }), []);

  const signIn = async (email: string, password: string) => {
    try { await signInWithEmailAndPassword(auth, email, password); return { error: null }; }
    catch (cause) { return { error: cause instanceof Error ? cause : new Error('Unable to sign in') }; }
  };
  const signInWithGoogle = async () => {
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const profileRef = doc(db, 'profiles', credential.user.uid);
      const [profileSnapshot, roleSnapshot] = await Promise.all([
        getDoc(profileRef),
        getDoc(doc(db, 'user_roles', credential.user.uid)),
      ]);
      if (!roleSnapshot.exists()) {
        await setDoc(doc(db, 'user_roles', credential.user.uid), { role: 'rider', updated_at: serverTimestamp() });
      }
      if (!profileSnapshot.exists()) {
        const newProfile = {
          full_name: credential.user.displayName || 'Rider',
          phone: credential.user.phoneNumber || '',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };
        await setDoc(profileRef, newProfile);
        setProfile({ id: credential.user.uid, full_name: newProfile.full_name, phone: newProfile.phone });
      }
      const storedRole = roleSnapshot.data()?.role;
      setRole(typeof storedRole === 'string' ? storedRole as AppRole : 'rider');
      return { error: null };
    } catch (cause) {
      return { error: cause instanceof Error ? cause : new Error('Unable to continue with Google') };
    }
  };
  const signUp: AuthContextType['signUp'] = async (email, password, metadata) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'user_roles', credential.user.uid), { role: 'rider', updated_at: serverTimestamp() });
      await setDoc(doc(db, 'profiles', credential.user.uid), {
        full_name: metadata.full_name, phone: metadata.phone,
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
      });
      setProfile({ id: credential.user.uid, full_name: metadata.full_name, phone: metadata.phone });
      setRole('rider');
      return { error: null };
    } catch (cause) { return { error: cause instanceof Error ? cause : new Error('Unable to create account') }; }
  };
  const signOut = async () => { await firebaseSignOut(auth); };

  return <AuthContext.Provider value={{ user, session: user ? { user } : null, profile, role, loading, signIn, signInWithGoogle, signUp, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
