import { adminAuth, adminDb } from '$lib/firebase-admin';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Get session cookie
  const sessionCookie = event.cookies.get('session');
  console.log('Session cookie:', sessionCookie);

  // Verify session if it exists
  if (sessionCookie) {
    try {
      console.log('Session cookie exists, verifying token...');
      // Verify session cookie and retrieve user data
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
      console.log('Decoded token:', decodedToken);

      const userDoc = await adminDb.doc(`users/${decodedToken.uid}`).get();
      console.log('User document:', userDoc.data());

      if (!userDoc.exists) throw new Error('User not found');

      // Attach the user information to locals for easy access in the routes
      event.locals.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...userDoc.data()
      };
      console.log('User added to locals:', event.locals.user);
    } catch (error) {
      console.error('Error verifying session cookie:', error);
      // If the token verification fails, clear the session cookie and redirect to login
      event.cookies.delete('session', { path: '/' });
      console.log('Session cookie deleted, redirecting to login...');
      throw redirect(307, '/login');
    }
  } else {
    console.log('No session cookie found.');
  }

  // Get current path for route protection
  const path = event.url.pathname;
  console.log('Current path:', path);

  // Define protected routes that require authentication
  const protectedRoutes = ['/settings', '/cart', '/pending-pickup', '/order-history'];

  // Define admin routes that require admin role
  const adminRoutes = ['/admin', '/admin/inventory', '/admin/inventory/add', '/admin/inventory/edit', '/admin/statistics', '/admin/order-history'];

  // Allow access to /admin-login for unauthenticated users
  if (path === '/admin-login' && !event.locals.user) {
    return resolve(event); // Let them access the login page
  }

  // Check access for protected routes (for authenticated users)
  if (protectedRoutes.some(route => path.startsWith(route))) {
    console.log('Protected route access check for path:', path);

    // If the user is not authenticated, redirect to login
    if (!event.locals.user) {
      console.log('No user found, redirecting to login...');
      throw redirect(307, '/login');
    }
  }

  // Check access for admin routes (for admin users only)
  if (adminRoutes.some(route => path.startsWith(route))) {
    console.log('Admin route access check for path:', path);

    // If the user is not authenticated, redirect to login
    if (!event.locals.user) {
      console.log('No user found, redirecting to login...');
      throw redirect(307, '/');
    }

    // If the user is not an admin, redirect to login
    if (event.locals.user.role !== 'admin') {
      console.log('User is not an admin, redirecting to login...');
      throw redirect(307, '/login');
    }
  }

  // If the user is already logged in and trying to access login or register pages, redirect to the home page
  const authRoutes = ['/login', '/register', '/', '/medicine'];
  
  if (authRoutes.includes(path) && event.locals.user) {
    console.log('User already logged in, redirecting from login or register...');
    throw redirect(307, '/');
  }

  // Continue resolving the event if no redirects are triggered
  const response = await resolve(event);
  console.log('Response resolved, returning...');
  return response;
};
