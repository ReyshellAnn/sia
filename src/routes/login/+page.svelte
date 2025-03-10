<script lang="ts">
	import '../../app.css';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import { doc, getDoc } from 'firebase/firestore';
	import { auth, db } from '$lib/firebase'; // Firebase config file
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { signOut } from 'firebase/auth';


	import { goto } from '$app/navigation';
	import { Toaster, toast } from 'svelte-sonner';
	import { writable, get } from 'svelte/store';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag
	let showForgotPassword = writable(false);

	async function login(event: Event) {
  event.preventDefault();
  if (isLoading) return;
  isLoading = true;

  console.log('Login attempt started');

  try {
    // First, sign in using Firebase Authentication (to get the idToken)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in:', userCredential.user);

    // Fetch the user data from Firestore to check the role
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      // If the user is an admin, prevent login and show error
      if (userData.role === 'admin') {
        toast.error('Admin users are not allowed to log in here.');
        
        // Sign out the user immediately
        await signOut(auth);  // Ensure this is awaited to finish before proceeding
        return;  // Stop the login process for admins
      }

      // If not an admin, proceed as usual
      const idToken = await userCredential.user.getIdToken();
      console.log('ID Token obtained:', idToken);

      // Now, call the API route to handle session creation securely
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken })
      });

      const result = await response.json();
      console.log('API response:', result);

      if (response.ok) {
        // If the response is successful, redirect the user
        toast.success('Login successful!');
        goto('/');
      } else {
        // If access is denied or an error occurs
        toast.error(result.error || 'Login failed');
      }
    } else {
      toast.error('User data not found.');
    }
  } catch (error: any) {
    console.error('Login error:', error.code, error.message);
    const friendlyMessage = getFriendlyErrorMessage(error.code);
    toast.error(friendlyMessage);
    console.log('Error message for user:', friendlyMessage);
  } finally {
    // Ensure loading flag is turned off after the process finishes
    isLoading = false;
  }
}





function getFriendlyErrorMessage(errorCode: string): string {
	const errorMessages: Record<string, string> = {
		'auth/invalid-email': 'Invalid email format. Please enter a valid email.',
		'auth/user-not-found': 'No account found with this email.',
		'auth/wrong-password': 'Incorrect password. Please try again.',
		'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
		'auth/user-disabled': 'This account has been disabled. Contact support for assistance.',
		'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
		'auth/network-request-failed': 'Network error. Check your internet connection.',
		'auth/requires-recent-login': 'Please log in again to continue.',
		'auth/popup-closed-by-user': 'Login process was interrupted. Please try again.'
	};

	return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
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

<header class="flex w-full items-center justify-center bg-white p-4 shadow-md lg:hidden">
	<h1 class="text-3xl font-bold uppercase"><span class="text-orange-400">Medi</span>Quick</h1>
</header>

<div class="flex min-h-screen w-full bg-orange-400">
	<!-- Left Side (MediQuick Branding) - Hidden on md and smaller -->
	<div class="hidden w-1/2 items-center justify-center bg-white lg:flex">
		<h1 class="text-4xl font-bold uppercase sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
			<span class="text-orange-400">Medi</span>Quick
		</h1>
	</div>

	<!-- Right Side (Login Form) -->
	<div class="flex w-full items-center justify-center px-4 sm:px-6 md:px-8 lg:w-1/2">
		<Toaster />
		<Card.Root class="mx-auto w-full max-w-sm">
			<Card.Header class="text-center">
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
						<Input
							id="email"
							type="email"
							bind:value={email}
							placeholder="m@example.com"
							required
							class="w-full"
						/>
					</div>
					<div class="grid gap-2">
						<div class="flex items-center">
							<Label for="password">Password</Label>
						</div>
						<Input id="password" type="password" bind:value={password} required class="w-full" />
						<a
							href="##"
							class="ml-auto text-sm underline"
							on:click={() => showForgotPassword.set(true)}
						>
							Forgot your password?
						</a>
					</div>
					<Button
						type="submit"
						class="w-full bg-orange-400 py-3 text-base hover:bg-orange-300"
						onclick={login}
						disabled={isLoading}
					>
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
</div>

{#if $showForgotPassword}
	<div
		class="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 px-4 sm:px-6"
	>
		<div class="w-full max-w-sm rounded-md bg-white p-6 sm:max-w-md md:max-w-lg">
			<h2 class="mb-4 text-center text-xl sm:text-left">Reset Your Password</h2>
			<form on:submit={sendResetEmail}>
				<div class="mb-4">
					<Label for="reset-email">Enter your email address:</Label>
					<Input
						id="reset-email"
						type="email"
						bind:value={email}
						placeholder="Enter your email"
						required
						class="w-full"
					/>
				</div>
				<Button type="submit" class="w-full py-3 text-lg" disabled={isLoading}>
					{#if isLoading}
						<span>Loading...</span>
					{:else}
						Send Reset Email
					{/if}
				</Button>
			</form>
			<button
				class="mt-4 w-full text-center text-sm text-blue-600"
				on:click={() => showForgotPassword.set(false)}
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
