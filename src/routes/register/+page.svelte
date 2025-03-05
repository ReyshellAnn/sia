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

	async function register() {
		isLoading = true;
		errorMessage = '';

		if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
			errorMessage = "All fields are required!";
			isLoading = false;
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = "Passwords do not match!";
			isLoading = false;
			return;
		}

		if (!captchaToken) {
			errorMessage = "Please complete the CAPTCHA verification!";
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
		} catch (error) {
			toast.error(errorMessage);
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

