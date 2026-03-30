import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import { DEFAULT_COMMISSION_RATE } from './constants';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time profile updates (e.g., wallet balance)
        unsubProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              isProfileComplete: false,
              role: firebaseUser.email === 'bhavyapurnea2024@gmail.com' ? 'admin' : 'user',
              couponCode: (firebaseUser.displayName?.split(' ')[0].toUpperCase() || 'USER') + Math.floor(1000 + Math.random() * 9000),
              commissionRate: DEFAULT_COMMISSION_RATE,
              wallet: {
                pending: 0,
                withdrawable: 0,
                totalEarned: 0,
              },
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          // Only report error if user is still logged in
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || (user?.email === 'bhavyapurnea2024@gmail.com' && user?.emailVerified);

  useEffect(() => {
    if (user?.email === 'bhavyapurnea2024@gmail.com' && user?.emailVerified && profile && profile.role !== 'admin') {
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, { role: 'admin' }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      });
    }
  }, [user, profile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
