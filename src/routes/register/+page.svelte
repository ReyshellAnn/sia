<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import '../../app.css';
	import { auth, db } from '$lib/firebase'; // Firebase config file
	import { createUserWithEmailAndPassword } from 'firebase/auth';
	import { doc, setDoc } from 'firebase/firestore';
	import { Toaster, toast } from 'svelte-sonner';

	let fullName = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag

	async function register() {
		// Set loading state to true
		isLoading = true;

		// Validation: Ensure all fields are filled
		if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
			errorMessage = 'All fields are required!';
			isLoading = false; // Reset loading state
			return;
		}

		// Validation: Ensure passwords match
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match!';
			isLoading = false; // Reset loading state
			return;
		}

		try {
			// Create user with email and password
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;

			// Set user document in Firestore with full name
			await setDoc(doc(db, 'users', user.uid), {
				fullName,
				email: user.email,
				role: 'customer',
				createdAt: new Date().toISOString()
			});

			// Show success toast
			toast.success('Account created successfully!');

			// Redirect to login page after successful registration
			window.location.href = '/login';
		} catch (error) {
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			// Reset loading state
			isLoading = false;
		}
	}
</script>

<div class="flex h-screen w-full items-center justify-center bg-blue-200 px-4">
	<Toaster />
	<!-- Toast component for notifications -->
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Register</Card.Title>
			<Card.Description>Enter your details below to create an account</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4">
				{#if errorMessage}
					<p class="text-sm text-red-500">{errorMessage}</p>
				{/if}
				<div class="grid gap-2">
					<Label for="full-name">Full Name</Label>
					<Input id="full-name" type="text" bind:value={fullName} placeholder="John Doe" required />
				</div>
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" bind:value={email} placeholder="m@example.com" required />
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" bind:value={password} required />
				</div>
				<div class="grid gap-2">
					<Label for="confirm-password">Confirm Password</Label>
					<Input id="confirm-password" type="password" bind:value={confirmPassword} required />
				</div>
                <Button type="submit" class="w-full" onclick={register} disabled={isLoading}>
                    {#if isLoading}
                        <span>Loading...</span>
                    {:else}
                        Register
                    {/if}
                </Button>
			</div>
			<div class="mt-4 text-center text-sm">
				Already have an account?
				<a href="/login" class="underline"> Sign in </a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
