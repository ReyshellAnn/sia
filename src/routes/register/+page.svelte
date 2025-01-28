<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import '../../app.css';
    import { auth, db } from '$lib/firebase'; // Firebase config file
    import { createUserWithEmailAndPassword } from "firebase/auth";
    import { doc, setDoc } from "firebase/firestore";

    let email = '';
    let password = '';
    let confirmPassword = '';
    let errorMessage = '';

    async function register() {
        if (password !== confirmPassword) {
            errorMessage = "Passwords do not match!";
            return;
        }

        try {
            // Create user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Set user document in Firestore with a role of 'customer'
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "customer", // Set the role to 'customer'
                createdAt: new Date().toISOString(),
            });

            // Redirect to login page after successful registration
            window.location.href = "/login";
        } catch (error) {
            if (error instanceof Error) {
                errorMessage = error.message;
            } else {
                errorMessage = "An unexpected error occurred.";
            }
        }
    }
</script>

<div class="flex h-screen w-full items-center justify-center px-4 bg-blue-200">
    <Card.Root class="mx-auto max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Register</Card.Title>
            <Card.Description>Enter your details below to create an account</Card.Description>
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
                    <Label for="password">Password</Label>
                    <Input id="password" type="password" bind:value={password} required />
                </div>
                <div class="grid gap-2">
                    <Label for="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" bind:value={confirmPassword} required />
                </div>
                <button type="button" class="w-full" on:click={register}>
                    Register
                </button>
            </div>
            <div class="mt-4 text-center text-sm">
                Already have an account?
                <a href="/login" class="underline"> Sign in </a>
            </div>
        </Card.Content>
    </Card.Root>
</div>
