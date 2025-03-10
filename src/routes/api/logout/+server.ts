// src/routes/api/logout/+server.ts
import { json } from '@sveltejs/kit';
import { serialize } from 'cookie';

export const POST = async () => {
  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': serialize('session', '', {
          path: '/',
          expires: new Date(0),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
      }
    }
  );
};