// src/lib/server/firebase-admin.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const adminApp = initializeApp({
  credential: cert({
    projectId: import.meta.env.VITE_PROJECT_ID,
    clientEmail: import.meta.env.VITE_FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: import.meta.env.VITE_FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
