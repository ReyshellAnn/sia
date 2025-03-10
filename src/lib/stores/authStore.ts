import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { browser } from '$app/environment'; // To detect if we're in the browser environment

export const user = writable<User | null | any>(null); // Allow custom fields

onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Fetch Firestore user document
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userDocSnap.data(), // Includes fullName, role, createdAt
      };

      user.set(userData);
    } else {
      user.set(firebaseUser); // Fallback to auth-only data
    }
  } else {
    console.log("🚪 User logged out.");
    user.set(null);
  }
});
