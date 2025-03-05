import type { PageLoad } from './$types';
import { user } from '$lib/stores/authStore';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async () => {
  let currentUser: any;
  const unsubscribe = user.subscribe((u) => (currentUser = u));
  unsubscribe(); // Clean up immediately after fetching the value

  if (!currentUser) {
    throw redirect(302, '/login'); // Redirect immediately
  }

  return {}; // Allow the page to load if authenticated
};
