import { json, type RequestHandler } from '@sveltejs/kit';
import sendGridMail from '@sendgrid/mail';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '$lib/firebase';

// Set your SendGrid API Key from environment variable
sendGridMail.setApiKey(process.env.SENDGRID_API_KEY!); // Correct usage for server-side environment variables

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Get the email from the request body
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Missing email' }, { status: 400 });
    }

    console.log('Email received for reset: ', email);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Firebase error during password reset:', error);
      return json({ error: 'Failed to send password reset email. Please check the email and try again.' }, { status: 400 });
    }
    

    // Send the password reset link via SendGrid
    const msg = {
      to: email, // The recipient email
      from: 'rachelleannespicedefelix@gmail.com', // Your verified SendGrid email
      subject: 'Password Reset Request',
      text: `Click the link below to reset your password: \n\nhttps://yourdomain.com/reset-password?email=${email}`,
      html: `<p>Click the link below to reset your password:</p><p><a href="https://yourdomain.com/reset-password?email=${email}">Reset Password</a></p>`,
    };

    // Send the email via SendGrid
    await sendGridMail.send(msg).then(
      (response) => {
        console.log('SendGrid response:', response);
      },
      (error) => {
        console.error('SendGrid error:', error);
        return json({ error: 'Failed to send email via SendGrid.' }, { status: 500 });
      }
    );
    

    // Return success message
    return json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error sending password reset email:', error);

    // Return error message if something goes wrong
    return json({ error: 'Failed to send password reset email. Please try again later.' }, { status: 500 });
  }
};
