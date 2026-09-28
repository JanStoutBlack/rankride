import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyChL2z2paJf1blPN4mUagUHH6IcYrA3zRk',
  authDomain: 'rank-ride.firebaseapp.com',
  projectId: 'rank-ride',
  storageBucket: 'rank-ride.firebasestorage.app',
  messagingSenderId: '1072308214474',
  appId: '1:1072308214474:web:2f153a60ac3dfb42503233',
  measurementId: 'G-36WTPPBET4',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, 'us-central1');
