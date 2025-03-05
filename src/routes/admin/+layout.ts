import type { LayoutLoad } from './$types';
import { user } from '$lib/stores/authStore';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async () => {
  let currentUser: any;
  
  // Wait for the user store to update properly
  const unsubscribe = user.subscribe((u) => (currentUser = u));
  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure store updates
  unsubscribe(); // Clean up after getting the value

  if (!currentUser) {
    console.warn("🚫 Not logged in! Redirecting...");
    throw redirect(302, '/'); // Not logged in → Redirect to login
  }

  if (!currentUser.role || currentUser.role !== 'admin') {
    console.warn("⛔ Not an admin! Redirecting...");
    throw redirect(302, '/'); // Not an admin → Redirect to home
  }

  return {}; // Allow access if admin
};
