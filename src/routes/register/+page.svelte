<script lang="ts">
	import '../../app.css';
	import { Toaster, toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let fullName = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let errorMessage = '';
	let isLoading = false;
	let siteKey = "6LdjKuQqAAAAAK-iJx_5AxlIEHbEEQpiwGTqigfG"; // Replace with your reCAPTCHA site key
	let captchaToken = '';

	// Load reCAPTCHA dynamically & define global callback
	onMount(() => {
		// Global function for reCAPTCHA callback
		(window as any).onCaptchaSuccess = (token: string) => {
			captchaToken = token;
		};

		// Load reCAPTCHA script
		const script = document.createElement('script');
		script.src = "https://www.google.com/recaptcha/api.js";
		script.async = true;
		script.defer = true;
		document.body.appendChild(script);
	});

	function getFriendlyErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'The email format is incorrect.',
        'auth/email-already-in-use': 'The email is already associated with another account.',
        'auth/weak-password': 'The password is too weak and must be at least 6 characters.',
        'auth/missing-email': 'No email was provided during registration.',
        'auth/missing-password': 'No password was provided during registration.',
        'auth/operation-not-allowed': 'This sign-up method is disabled. Contact support for assistance.'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}


	async function register() {
	isLoading = true;
	errorMessage = '';

	if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
		toast.error("All fields are required!");
		isLoading = false;
		return;
	}

	if (password !== confirmPassword) {
		toast.error("Passwords do not match!");
		isLoading = false;
		return;
	}

	if (!captchaToken) {
		toast.error("Please complete the CAPTCHA verification!");
		isLoading = false;
		return;
	}

	try {
		const response = await fetch('/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fullName, email, password, captchaToken })
		});

		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Registration failed.');

		toast.success("Account created successfully!");
		goto('/login');
	} catch (error: any) {
    console.error("Registration error:", error);

    let errorCode = "unknown";
    let friendlyMessage = "An unexpected error occurred. Please try again.";

    // If the error is from Firebase, use the error returned by the backend
    if (error instanceof Error) {
        errorCode = error.message; // Firebase error codes come in message field from backend
    } else if (typeof error === "object" && error.error) {
        errorCode = error.error; // If backend sends { error: "auth/weak-password" }
    }

    friendlyMessage = getFriendlyErrorMessage(errorCode);
    toast.error(friendlyMessage);
}



finally {
		isLoading = false;

		 // **Reset reCAPTCHA to get a new token**
		 grecaptcha.reset(); // 👈 This refreshes the CAPTCHA so the user gets a new token
        captchaToken = '';
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

	<!-- Right Side (Register Form) -->
	<div class="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6 md:px-8">
		<Toaster />
		<Card.Root class="mx-auto w-full max-w-sm">
			<Card.Header class="text-center">
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
					<!-- Google reCAPTCHA -->
					<div class="g-recaptcha" data-sitekey={siteKey} data-callback="onCaptchaSuccess"></div>
					<Button type="submit" class="w-full bg-orange-400 hover:bg-orange-300 py-3 text-base" onclick={register} disabled={isLoading}>
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
</div>

