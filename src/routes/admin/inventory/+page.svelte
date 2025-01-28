<script lang="ts">
    import { onMount } from "svelte";
    import { doc, getDoc } from "firebase/firestore";
    import { auth } from "$lib/firebase";
    import { db } from "$lib/firebase"; // Firestore reference
    import { onAuthStateChanged } from "firebase/auth"; // Firebase Auth state

    let isAuthorized = false;  // This will track if the user is authorized to view the content
    let errorMessage = "";     // Optional: Handle error if any

    onMount(() => {
        // Immediately check if the user is authenticated before rendering any content
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // If no user is authenticated, redirect immediately to homepage
                console.log("No user is authenticated. Redirecting to homepage.");
                window.location.href = "/"; // Redirect to homepage
                return;
            }

            try {
                // Get user role from Firestore (assuming the user document is under 'users/{userId}')
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    // If user is not an admin, set isAuthorized to false and redirect to homepage
                    if (userData?.role !== 'admin') {
                        console.log("User is not an admin. Redirecting to homepage.");
                        window.location.href = "/"; // Redirect to homepage or other page
                    } else {
                        console.log("User is authenticated as an admin.");
                        isAuthorized = true; // Allow access to admin content
                    }
                } else {
                    console.error("User document not found in Firestore.");
                    window.location.href = "/login"; // Redirect to login if user doc not found
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                errorMessage = "An error occurred while checking user role.";
                window.location.href = "/"; // Fallback to homepage if error occurs
            }
        });
    });
</script>

<!-- The content will not be rendered at all until authentication check is complete -->
{#if isAuthorized}
  <h1>Inventory</h1> <!-- Content shown only to authorized users -->
{:else if errorMessage}
  <p style="color: red;">{errorMessage}</p> <!-- Optional: Display error message if there is one -->
{/if}
