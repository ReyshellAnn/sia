// src/routes/api/login/+server.ts
import { adminAuth, adminDb } from '$lib/firebase-admin';
import { json } from '@sveltejs/kit';
import { serialize } from 'cookie';

export const POST = async ({ request }) => {
  const { idToken } = await request.json();
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  // Verify user role in Firestore
  const userDoc = await adminDb.doc(`users/${decodedToken.uid}`).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'customer') {
    return json({ error: 'Access denied' }, { status: 403 });
  }

  // Create session cookie
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: 60 * 60 * 24 * 5 * 1000 // 5 days
  });

  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': serialize('session', sessionCookie, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 5 // 5 days
        })
      }
    }
  );
};
