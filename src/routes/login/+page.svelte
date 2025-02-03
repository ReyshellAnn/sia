<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import '../../app.css';
	import { auth } from '$lib/firebase'; // Firebase config file
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { goto } from '$app/navigation';
  	import { Toaster, toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';

	let email = '';
	let password = '';
	let errorMessage = '';
  	let isLoading = false; // Loading state flag
	let showForgotPassword = writable(false);

	async function login(event: Event) {
		event.preventDefault();
		isLoading = true; // Set loading state to true

		try {
			// Sign in with Firebase Auth
			await signInWithEmailAndPassword(auth, email, password);

			// Show success toast
			toast.success('Login successful!');

			// Redirect to the dashboard or home page after successful login
			goto('/');
		} catch (error) {
			if (error instanceof Error) {
				errorMessage = error.message; // Display the error message
			} else {
				errorMessage = 'An unexpected error occurred.';
			}
		} finally {
			isLoading = false; // Reset loading state
		}
	}

	async function sendResetEmail(event: Event) {
	event.preventDefault();
	isLoading = true;

	try {
		const response = await fetch('/api/forgot-password', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email })
		});

		const result = await response.json();
		if (response.ok) {
			toast.success(result.message);
			showForgotPassword.set(false); // Close the forgot password form after success
		} else {
			toast.error(result.error);
		}
	} catch (error) {
		toast.error('An error occurred while sending the reset email.');
	} finally {
		isLoading = false;
	}
}

</script>

<div class="flex h-screen w-full items-center justify-center bg-blue-200 px-4">
  <Toaster />
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Login</Card.Title>
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
					<a href="##" class="ml-auto inline-block text-sm underline" on:click={() => showForgotPassword.set(true)}>
						Forgot your password?
					  </a>					  
				</div>
        <Button type="submit" class="w-full" onclick={login} disabled={isLoading}>
					{#if isLoading}
						<span>Loading...</span>
					{:else}
						Login
					{/if}
				</Button>
			</div>
			<div class="mt-4 text-center text-sm">
				Don't have an account?
				<a href="/register" class="underline"> Sign up </a>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if $showForgotPassword}
	<div class="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center">
		<div class="bg-white p-6 rounded-md w-96">
			<h2 class="text-xl mb-4">Reset Your Password</h2>
			<form on:submit={sendResetEmail}>
				<div class="mb-4">
					<Label for="reset-email">Enter your email address:</Label>
					<Input id="reset-email" type="email" bind:value={email} placeholder="Enter your email" required />
				</div>
				<Button type="submit" class="w-full" disabled={isLoading}>
					{#if isLoading}
						<span>Loading...</span>
					{:else}
						Send Reset Email
					{/if}
				</Button>
			</form>
			<button class="mt-4 text-sm text-blue-600" on:click={() => showForgotPassword.set(false)}>
				Cancel
			</button>
		</div>
	</div>
{/if}

