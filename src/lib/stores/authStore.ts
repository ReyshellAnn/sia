// src/lib/stores/authStore.ts
import { writable } from 'svelte/store';
import { auth } from '$lib/firebase'; // Ensure this points to your Firebase initialization
import { onAuthStateChanged, type User } from 'firebase/auth';

export const user = writable<User | null>(null);

onAuthStateChanged(auth, (firebaseUser) => {
  user.set(firebaseUser);
});
