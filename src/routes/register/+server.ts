import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { auth, db } from '$lib/firebase'; // Firebase configuration
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const RECAPTCHA_SECRET = "6LdjKuQqAAAAAMQNnUbY6NVKHUbpuT7M95jXQZIL"; // Replace with your Google reCAPTCHA secret key

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { fullName, email, password, captchaToken } = await request.json();

		// Verify reCAPTCHA token with Google
		const recaptchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				secret: RECAPTCHA_SECRET,
				response: captchaToken
			}).toString()
		});

		const recaptchaData = await recaptchaRes.json();
		if (!recaptchaData.success) {
			return json({ error: "CAPTCHA verification failed!" }, { status: 400 });
		}

		// Create Firebase user
		const userCredential = await createUserWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		// Store user info in Firestore
		await setDoc(doc(db, "users", user.uid), {
			fullName,
			email: user.email,
			role: "customer",
			createdAt: new Date().toISOString(),
		});

		return json({ message: "User registered successfully!" });
	} catch (error) {
		// Check if Firebase threw an error
		let errorCode = "auth/unknown-error";
		if (error instanceof Error) {
			const firebaseErrorMatch = error.message.match(/\((.*?)\)/);
			if (firebaseErrorMatch) {
				errorCode = firebaseErrorMatch[1]; // Extracts error like "auth/weak-password"
			}
		}

		console.error("Firebase Registration Error:", error);

		return json({ error: errorCode }, { status: 400 });
	}
};
