import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, logout } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile } from './types';
import { DEFAULT_COMMISSION_RATE, DEFAULT_DISCOUNT_RATE } from './constants';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isOpen: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
  signIn: async () => {},
  signUp: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      const userDocRef = doc(db, 'users', newUser.uid);
      const newProfile: UserProfile = {
        uid: newUser.uid,
        email: email,
        displayName: name,
        phoneNumber: phone,
        password: password,
        isProfileComplete: true,
        role: (email === 'piyushpurnea15@gmail.com' || email === 'prcreations2927@gmail.com' || email === 'bhavyapurnea2024@gmail.com') ? 'admin' : 'user',
        couponCode: (name.split(' ')[0].toUpperCase() || 'USER') + Math.floor(1000 + Math.random() * 9000),
        commissionRate: DEFAULT_COMMISSION_RATE,
        customCommissionRate: DEFAULT_COMMISSION_RATE,
        customDiscountRate: DEFAULT_DISCOUNT_RATE,
        isCouponDisabled: false,
        wallet: {
          pending: 0,
          withdrawable: 0,
          totalEarned: 0,
        },
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile);
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Check if we have stored info from a custom login attempt
            // For now, if no profile exists, we'll wait for the user to provide details
            // or use defaults if they just signed in anonymously without the form.
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
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

  const isAdmin = profile?.role === 'admin' || 
                  profile?.email === 'piyushpurnea15@gmail.com' || 
                  profile?.email === 'prcreations2927@gmail.com' || 
                  profile?.email === 'bhavyapurnea2024@gmail.com';

  useEffect(() => {
    if ((profile?.email === 'piyushpurnea15@gmail.com' || profile?.email === 'prcreations2927@gmail.com' || profile?.email === 'bhavyapurnea2024@gmail.com') && profile.role !== 'admin') {
      const userDocRef = doc(db, 'users', profile.uid);
      updateDoc(userDocRef, { role: 'admin' }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      });
    }
  }, [profile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isLoginModalOpen, setIsLoginModalOpen, signIn, signUp, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};
