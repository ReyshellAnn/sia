import { json, type RequestHandler } from '@sveltejs/kit';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '$lib/firebase';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Get the email from the request body
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Missing email' }, { status: 400 });
    }

    console.log('Email received for reset: ', email);

    try {
      // Send the password reset link using Firebase Authentication
      await sendPasswordResetEmail(auth, email);
      console.log('Firebase password reset link sent.');

      // Return a success message
      return json({ message: 'Password reset email sent successfully' });
    } catch (error) {
      console.error('Error sending Firebase password reset email:', error);
      return json({ error: 'Failed to send password reset email via Firebase.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return json({ error: 'Failed to send password reset email. Please try again later.' }, { status: 500 });
  }
};
