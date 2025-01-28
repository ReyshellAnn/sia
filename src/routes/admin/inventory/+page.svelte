<script lang="ts">
    import { onMount } from "svelte";
    import { doc, getDoc } from "firebase/firestore";
    import { auth } from "$lib/firebase";
    import { db } from "$lib/firebase"; // Firestore reference
    import { onAuthStateChanged } from "firebase/auth"; // Firebase Auth state
    import * as Table from "$lib/components/ui/table/index.js";
    import { Input } from "$lib/components/ui/input/index.js";

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

    const invoices = [
    {
      invoice: "INV001",
      paymentStatus: "Paid",
      totalAmount: "$250.00",
      paymentMethod: "Credit Card"
    },
    {
      invoice: "INV002",
      paymentStatus: "Pending",
      totalAmount: "$150.00",
      paymentMethod: "PayPal"
    },
    {
      invoice: "INV003",
      paymentStatus: "Unpaid",
      totalAmount: "$350.00",
      paymentMethod: "Bank Transfer"
    },
    {
      invoice: "INV004",
      paymentStatus: "Paid",
      totalAmount: "$450.00",
      paymentMethod: "Credit Card"
    },
    {
      invoice: "INV005",
      paymentStatus: "Paid",
      totalAmount: "$550.00",
      paymentMethod: "PayPal"
    },
    {
      invoice: "INV006",
      paymentStatus: "Pending",
      totalAmount: "$200.00",
      paymentMethod: "Bank Transfer"
    },
    {
      invoice: "INV007",
      paymentStatus: "Unpaid",
      totalAmount: "$300.00",
      paymentMethod: "Credit Card"
    }
  ];
</script>

<!-- The content will not be rendered at all until authentication check is complete -->
{#if isAuthorized}
<header>
    Inventory List

    <Input type="search" placeholder="Search Medicine" class="max-w-xs" />
    </header>
<Table.Root>
    <Table.Caption>A list of your recent invoices.</Table.Caption>
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-[100px]">Invoice</Table.Head>
        <Table.Head>Status</Table.Head>
        <Table.Head>Method</Table.Head>
        <Table.Head class="text-right">Amount</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each invoices as invoice, i (i)}
        <Table.Row>
          <Table.Cell class="font-medium">{invoice.invoice}</Table.Cell>
          <Table.Cell>{invoice.paymentStatus}</Table.Cell>
          <Table.Cell>{invoice.paymentMethod}</Table.Cell>
          <Table.Cell class="text-right">{invoice.totalAmount}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
    <Table.Footer>
      <Table.Row>
        <Table.Cell colspan={3}>Total</Table.Cell>
        <Table.Cell class="text-right">$2,500.00</Table.Cell>
      </Table.Row>
    </Table.Footer>
  </Table.Root>
{:else if errorMessage}
  <p style="color: red;">{errorMessage}</p> <!-- Optional: Display error message if there is one -->
{/if}
