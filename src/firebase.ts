import { initializeApp } from 'firebase/app';
import { getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocs, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

// Use environment variables if available (Vercel-friendly), otherwise fallback to JSON
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId;

// Initialize Firebase SDK
console.log("Initializing Firebase with project ID:", firebaseConfigJson.projectId);
console.log("Using Firestore database ID:", firebaseConfigJson.firestoreDatabaseId);
const app = initializeApp(firebaseConfigJson);
export const db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const logAction = async (userId: string | null | undefined, userEmail: string | null | undefined, userName: string | null | undefined, action: string, details: string, type: 'user' | 'admin' = 'user') => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId: userId || 'unknown',
      userEmail: userEmail || 'unknown',
      userName: userName || 'unknown',
      action: action || 'unknown',
      details: details || 'unknown',
      type: type || 'user',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

// Connection test
async function testConnection() {
  try {
    const dbId = firebaseConfigJson.firestoreDatabaseId;
    const projId = firebaseConfigJson.projectId;
    console.log(`Testing Firestore connection [Project: ${projId}, Database: ${dbId}]`);
    
    // Use getDocFromServer to bypass cache and force a network request
    const testDocRef = doc(db, 'test', 'connection');
    const testDoc = await getDocFromServer(testDocRef);
    
    console.log("Firestore connection successful. Test doc exists:", testDoc.exists());
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("CRITICAL: Firestore client is offline. This usually means the Project ID or Database ID in firebase-applet-config.json is incorrect or the database hasn't been provisioned.");
      } else if (error.message.includes('permission-denied')) {
        console.error("Firestore permission denied. Rules might be blocking the test connection.");
      }
    }
  }
}
testConnection();

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};
