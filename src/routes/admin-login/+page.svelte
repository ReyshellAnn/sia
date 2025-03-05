<script lang="ts">
	import '../../app.css';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import { auth } from '$lib/firebase'; // Firebase config file
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase'; // Firestore reference

	import { user } from '$lib/stores/authStore'; // Import the auth store

	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag

	async function login(event: Event) {
	event.preventDefault();
	isLoading = true; // Set loading state to true

	try {
		// Sign in with Firebase Auth
		const userCredential = await signInWithEmailAndPassword(auth, email, password);

		// ✅ Use a different name for the Firebase user
		const firebaseUser = userCredential.user;
		const userDocRef = doc(db, 'users', firebaseUser.uid);
		const userDoc = await getDoc(userDocRef);

		if (userDoc.exists()) {
			const userData = userDoc.data();
			if (userData?.role === 'admin') {
				console.log('User is an admin. Redirecting to admin page.');

				// ✅ Update the Svelte store with user info
				user.set({
					uid: firebaseUser.uid,
					email: firebaseUser.email,
					...userData
				});

				// ✅ Use SvelteKit navigation instead of window.location
				import('$app/navigation').then(({ goto }) => goto('/admin'));
			} else {
				errorMessage = 'You do not have permission to access this page.';
				console.error('User is not an admin.');
			}
		} else {
			errorMessage = 'User data not found. Please contact support.';
			console.error('User document not found in Firestore.');
		}
	} catch (error) {
		if (error instanceof Error) {
			errorMessage = error.message; // Display the error message
		} else {
			errorMessage = 'An unexpected error occurred.';
		}
		console.error('Login error:', error);
	} finally {
		isLoading = false; // Reset loading state
	}
}
</script>

<div class="flex h-screen w-full items-center justify-center bg-blue-200 px-4">
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Admin Login</Card.Title>
			<Card.Description>Enter your email below to login to your account</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4">
				{#if errorMessage}
					<p class="text-sm text-red-500">{errorMessage}</p>
				{/if}
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" bind:value={email} placeholder="m@example.com" required />
				</div>
				<div class="grid gap-2">
					<div class="flex items-center">
						<Label for="password">Password</Label>
					</div>
					<Input id="password" type="password" bind:value={password} required />
				</div>
				<Button type="submit" class="w-full" onclick={login} disabled={isLoading}>
					{#if isLoading}
						<span>Loading...</span>
					{:else}
						Login
					{/if}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
