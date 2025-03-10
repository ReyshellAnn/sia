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

	import { Toaster, toast } from 'svelte-sonner';

	import { user } from '$lib/stores/authStore'; // Import the auth store

	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag

	async function login(event: Event) {
    event.preventDefault();
    if (isLoading) return; // Prevent submitting multiple times
    isLoading = true; // Set loading state to true

    console.log('Login attempt started');

    try {
      // Sign in with Firebase Authentication to get the idToken
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in:', userCredential.user);

      // Fetch user data from Firestore to check the role
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Check if the user is an admin
        if (userData.role !== 'admin') {
          // If the user is not an admin, reject the login attempt
          errorMessage = 'Only admin users are allowed to log in here.';
          console.log('User is not an admin. Login prevented.');
          await auth.signOut(); // Sign out the user immediately
          return;
        }

        // If the user is an admin, proceed with the login process
        const idToken = await userCredential.user.getIdToken();
        console.log('ID Token obtained:', idToken);

        // Call the API to create a session securely
        const response = await fetch('/api/admin-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });

        const result = await response.json();
        console.log('API response:', result);

        if (response.ok) {
          // Successful login response, proceed to the admin dashboard
          toast.success('Login successful!');
          import('$app/navigation').then(({ goto }) => goto('/admin')); // Redirect to admin dashboard
        } else {
          // Handle login failure
          errorMessage = result.error || 'Login failed';
          toast.error(errorMessage);
        }
      } else {
        errorMessage = 'User data not found. Please contact support.';
        console.error('User document not found in Firestore.');
      }
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
    } finally {
      isLoading = false; // Reset loading state
    }
  }
</script>

<div class="flex h-screen w-full items-center justify-center bg-orange-400 px-4">
	<Toaster />
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl text-center">Admin Login</Card.Title>
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
