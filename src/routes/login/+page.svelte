<script lang="ts">
	import '../../app.css';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import { doc, getDoc } from "firebase/firestore";
	import { auth, db } from '$lib/firebase'; // Firebase config file
	import { signInWithEmailAndPassword } from 'firebase/auth';
	
	import { goto } from '$app/navigation';
	import { Toaster, toast } from 'svelte-sonner';
	import { writable, get } from 'svelte/store';
	import { onMount } from 'svelte';

	// Declare without initializing
let loginAttempts = writable(0);
let lockoutTime = writable(0);

	onMount(() => {
    loginAttempts.set(parseInt(localStorage.getItem('loginAttempts') || '0'));
    lockoutTime.set(parseInt(localStorage.getItem('lockoutTime') || '0'));

    // Now, sync with localStorage
    loginAttempts.subscribe(value => localStorage.setItem('loginAttempts', value.toString()));
    lockoutTime.subscribe(value => {
        if (value > 0) {
            localStorage.setItem('lockoutTime', value.toString());
        } else {
            localStorage.removeItem('lockoutTime');
        }
    });
});

	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag
	let showForgotPassword = writable(false);

	// Sync loginAttempts to localStorage
	loginAttempts.subscribe(value => localStorage.setItem('loginAttempts', value.toString()));

	// Sync lockoutTime to localStorage
	lockoutTime.subscribe(value => {
	    if (value > 0) {
	        localStorage.setItem('lockoutTime', value.toString());
	    } else {
	        localStorage.removeItem('lockoutTime');
	    }
	});

	async function login(event: Event) {
	    event.preventDefault();

	    if (isLoading) return; // Prevent spamming
	    isLoading = true;

	    const maxLoginAttempts = 5;
	    const lockoutDuration = 60 * 1000; // 60 seconds

	    let attemptsValue = get(loginAttempts);
	    let lockoutValue = get(lockoutTime);

	    // 🔥 Show remaining lockout time
	    if (Date.now() < lockoutValue) {
	        let remainingTime = Math.ceil((lockoutValue - Date.now()) / 1000);
	        toast.error(`Too many failed attempts. Try again in ${remainingTime} seconds.`);
	        isLoading = false;
	        return;
	    }

	    try {
	        const userCredential = await signInWithEmailAndPassword(auth, email, password);
	        const user = userCredential.user;
	        const userDoc = await getDoc(doc(db, "users", user.uid));

	        if (!userDoc.exists()) {
	            toast.error("User not found!");
	            return;
	        }

	        const userData = userDoc.data();
	        if (userData.role !== "customer") {
	            toast.error("Access denied. Only customers can log in.");
	            return;
	        }

	        // 🔥 Reset login attempts & lockout when successful
	        loginAttempts.set(0);
	        lockoutTime.set(0);

	        toast.success("Login successful!");
	        goto("/");
	    } catch (error: any) {
	        console.error("Login error:", error.code, error.message); // 🔍 Debugging log

	        if (
	            error.code === "auth/invalid-email" ||
	            error.code === "auth/user-not-found" ||
	            error.code === "auth/wrong-password"
	        ) {
	            let newAttempts = get(loginAttempts) + 1;
	            loginAttempts.set(newAttempts);

	            if (newAttempts >= maxLoginAttempts) {
	                const lockoutUntil = Date.now() + lockoutDuration;
	                lockoutTime.set(lockoutUntil);
	                toast.error("Too many failed attempts. Try again in 60 seconds.");
	            } else {
	                toast.error("Invalid email or password.");
	            }
	        } else {
	            // 🔥 Display actual Firebase error
	            toast.error(`Login failed: ${error.message}`);
	        }
	    }

	    isLoading = false;
	}

	// Check lockout status on page load
	function checkLockoutStatus() {
	    const savedLockout = localStorage.getItem('lockoutTime');
	    if (savedLockout && Date.now() < parseInt(savedLockout)) {
	        lockoutTime.set(parseInt(savedLockout));
	    }
	}
	checkLockoutStatus();




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

<div class="flex min-h-screen w-full items-center justify-center bg-orange-300 px-4 sm:px-6 md:px-8">
	<Toaster />
	<Card.Root class="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg">
		<Card.Header class="text-center sm:text-left">
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
					<Input id="email" type="email" bind:value={email} placeholder="m@example.com" required class="w-full" />
				</div>
				<div class="grid gap-2">
					<div class="flex items-center">
						<Label for="password">Password</Label>
					</div>
					<Input id="password" type="password" bind:value={password} required class="w-full" />
					<a href="##" class="ml-auto text-sm underline" on:click={() => showForgotPassword.set(true)}>
						Forgot your password?
					</a>
				</div>
				<Button type="submit" class="w-full bg-orange-400 hover:bg-orange-300 py-3 text-lg" onclick={login} disabled={isLoading}>
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
	<div class="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50 px-4 sm:px-6">
		<div class="w-full max-w-sm sm:max-w-md md:max-w-lg rounded-md bg-white p-6">
			<h2 class="mb-4 text-xl text-center sm:text-left">Reset Your Password</h2>
			<form on:submit={sendResetEmail}>
				<div class="mb-4">
					<Label for="reset-email">Enter your email address:</Label>
					<Input id="reset-email" type="email" bind:value={email} placeholder="Enter your email" required class="w-full" />
				</div>
				<Button type="submit" class="w-full py-3 text-lg" disabled={isLoading}>
					{#if isLoading}
						<span>Loading...</span>
					{:else}
						Send Reset Email
					{/if}
				</Button>
			</form>
			<button class="mt-4 w-full text-sm text-blue-600 text-center" on:click={() => showForgotPassword.set(false)}>
				Cancel
			</button>
		</div>
	</div>
{/if}
