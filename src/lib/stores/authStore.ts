import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const user = writable<User | null | any>(null); // Allow custom fields

onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Fetch Firestore user document
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // Merge Firebase Auth user data with Firestore data
      user.set({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userDocSnap.data(), // Includes fullName, role, createdAt
      });
    } else {
      console.warn("No Firestore user document found for:", firebaseUser.uid);
      user.set(firebaseUser); // Fallback to auth-only data
    }
  } else {
    user.set(null);
  }
});
