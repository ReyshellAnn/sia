<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import '../../app.css';
    import { auth } from '$lib/firebase'; // Firebase config file
    import { signInWithEmailAndPassword } from "firebase/auth";
    import { goto } from '$app/navigation';
  
    let email = '';
    let password = '';
    let errorMessage = '';
  
    async function login(event: Event) {
      event.preventDefault();
  
      try {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
  
        // Redirect to the dashboard or home page after successful login
        goto('/');
  
      } catch (error) {
        if (error instanceof Error) {
          errorMessage = error.message; // Display the error message
        } else {
          errorMessage = "An unexpected error occurred.";
        }
      }
    }
  </script>

<div class="flex h-screen w-full items-center justify-center px-4 bg-blue-200">
    <Card.Root class="mx-auto max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Login</Card.Title>
            <Card.Description>Enter your email below to login to your account</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="grid gap-4">
                {#if errorMessage}
                    <p class="text-red-500 text-sm">{errorMessage}</p>
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
                    <a href="##" class="ml-auto inline-block text-sm underline">
                        Forgot your password?
                    </a>
                </div>
                <Button href="/" type="submit" class="w-full" onclick={login}>Login</Button>
            </div>
            <div class="mt-4 text-center text-sm">
                Don't have an account?
                <a href="/register" class="underline"> Sign up </a>
            </div>
        </Card.Content>
    </Card.Root>
</div>
