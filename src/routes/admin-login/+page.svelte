<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import '../../app.css';
    import { auth } from '$lib/firebase'; // Firebase config file
    import { signInWithEmailAndPassword } from "firebase/auth";
    import { doc, getDoc } from "firebase/firestore";
    import { db } from '$lib/firebase'; // Firestore reference

    let email = '';
    let password = '';
    let errorMessage = '';

    async function login(event: Event) {
        event.preventDefault();

        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Fetch the user role from Firestore
            const user = userCredential.user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData?.role === "admin") {
                    console.log("User is an admin. Redirecting to admin page.");
                    window.location.href = "/admin"; // Redirect to the admin page
                } else {
                    errorMessage = "You do not have permission to access this page.";
                    console.error("User is not an admin.");
                }
            } else {
                errorMessage = "User data not found. Please contact support.";
                console.error("User document not found in Firestore.");
            }
        } catch (error) {
            if (error instanceof Error) {
                errorMessage = error.message; // Display the error message
            } else {
                errorMessage = "An unexpected error occurred.";
            }
            console.error("Login error:", error);
        }
    }
</script>

<div class="flex h-screen w-full items-center justify-center px-4 bg-blue-200">
    <Card.Root class="mx-auto max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Admin Login</Card.Title>
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
                </div>
                <Button href="/" type="submit" class="w-full" onclick={login}>Login</Button>
            </div>
        </Card.Content>
    </Card.Root>
</div>
