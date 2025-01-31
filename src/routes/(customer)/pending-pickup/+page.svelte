<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { auth } from '$lib/firebase'; // Import Firebase auth
	import { onAuthStateChanged } from 'firebase/auth'; // To track user auth state
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import { goto } from '$app/navigation'; // For navigation

	let user = null; // Initialize as null
	let pickupItems: any[] = []; // Array to store pickup items
	let loading = true; // To track if the page is still loading the user
  let totalPrice = 0; // Initialize total price

	// Ensure user is authenticated and fetch pickup items after authentication
	onMount(() => {
		onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				// If no user is logged in, redirect to login page
				goto('/login');
				return;
			}

			user = currentUser; // Set user when authenticated
			loading = false; // Set loading to false once we know the user

			try {
				const q = query(collection(db, 'pickup'), where('userId', '==', user.uid)); // Query the pickup collection for this user
				const querySnapshot = await getDocs(q);

				pickupItems = querySnapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data()
				}));

				console.log(pickupItems); // Log the fetched items to check the structure

				// Calculate total price after fetching the items
				totalPrice = pickupItems.reduce((total, item) => total + (item.price * item.quantity), 0);
			} catch (error) {
				console.error('Error fetching pickup items:', error);
			}
		});
	});
</script>

<span>On Going Pickups</span>
{#if loading}
	<!-- Show loading spinner or a message while fetching the user -->
	<div>Loading...</div>
{:else}
	<!-- Add message for readying the total bill -->
	<div class="alert alert-info">
		<p class="font-bold">Please ready your total bill for your pickup</p>
	</div>

	<!-- Show total amount -->
	<div class="mt-4">
		<span class="text-lg font-bold">Total Bill: ₱{totalPrice}</span>
	</div>
	<div class="flex flex-col gap-2">
		{#each pickupItems as item}
			<div class="flex flex-[2] flex-col">
				<Card.Root>
					<Card.Content>
						<div class="flex flex-row justify-between">
							<div class="flex flex-row space-x-4">
								<img src="/placeholder.png" alt="Medicine" class="w-20" />
								<span>{item.name}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Price</span>
								<span>₱{item.price}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Qty</span>
								<span>{item.quantity}</span>
							</div>

							<!-- Display the Pickup Time -->
							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Pickup Time</span>
								<span>{item.pickupTime}</span>
								<!-- Displaying pickup time -->
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	</div>
{/if}
