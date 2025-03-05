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

	let email = '';
	let password = '';
	let errorMessage = '';
	let isLoading = false; // Loading state flag
	let showForgotPassword = writable(false);

    async function login(event: Event) {
        event.preventDefault();
        if (isLoading) return;
        isLoading = true;
    
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
    
            toast.success("Login successful!");
            goto("/");
        } catch (error: any) {
            console.error("Login error:", error.code, error.message);
            toast.error(`Login failed: ${error.message}`);
        }
    
        isLoading = false;
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
<header class="flex w-full items-center justify-center p-4 bg-white shadow-md lg:hidden">
	<h1 class="text-3xl font-bold uppercase"><span class="text-orange-400">Medi</span>Quick</h1>
</header>


<div class="flex min-h-screen w-full bg-orange-400">
	<!-- Left Side (MediQuick Branding) - Hidden on md and smaller -->
	<div class="hidden lg:flex w-1/2 items-center justify-center bg-white">
		<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold uppercase">
			<span class="text-orange-400">Medi</span>Quick
		</h1>
		
	</div>

	<!-- Right Side (Login Form) -->
	<div class="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6 md:px-8">
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
					<Button type="submit" class="w-full bg-orange-400 hover:bg-orange-300 py-3 text-base" onclick={login} disabled={isLoading}>
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
