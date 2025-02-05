<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { auth } from '$lib/firebase'; 
	import { onAuthStateChanged } from 'firebase/auth';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation'; 

	let user = null;
	let pickupOrders: any[] = [];
	let loading = true;
	let totalPrice = 0; 

	onMount(() => {
		onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				goto('/login');
				return;
			}

			user = currentUser;
			loading = false;

			try {
				// Query all pickup orders for the current user
				const q = query(collection(db, 'pickup'), where('userId', '==', user.uid));
				const querySnapshot = await getDocs(q);

				// Process the pickup orders
				pickupOrders = querySnapshot.docs.map((doc) => {
					const data = doc.data();
					const items = data.items || []; // Ensure items array exists

					// Calculate total price per order
					const orderTotal = items.reduce((sum: number, item: { price: number; quantity: number; }) => sum + item.price * item.quantity, 0);
					
					return {
						id: doc.id,
						createdAt: data.createdAt || 'Unknown Date',
						pickupTime: data.pickupTime || 'ASAP',
						items,
						orderTotal
					};
				});

				// Compute the overall total price
				totalPrice = pickupOrders.reduce((sum, order) => sum + order.orderTotal, 0);
			} catch (error) {
				console.error('Error fetching pickup orders:', error);
			}
		});
	});
</script>

<span class="text-2xl font-semibold">Current Pickups</span>
{#if loading}
	<div>Loading...</div>
{:else}
<div class="w-3/4 flex flex-col gap-2">
	<span class="font-light text-gray-600 text-sm">
		Please have your payment ready upon pickup. Show this message or a screenshot.
	</span>

	<span class="font-light text-sm">
		<strong>Important:</strong> Orders not picked up within an hour of the pickup time will be canceled.
	</span>
</div>



	<!-- Display Pickup Orders -->
	<div class="flex flex-col gap-4">
		{#each pickupOrders as order}
			<Card.Root>
				<Card.Content>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-600">Pickup Time: {order.pickupTime}</span>

						<!-- Display each item in the order -->
						{#each order.items as item}
							<div class="flex flex-row justify-between items-center border-b pb-2">
								<div class="flex flex-row space-x-4">
									<img src="{item.imageUrl}" alt="{item.name}" class="w-20" />
									<span>{item.name}</span>
								</div>

								<div class="flex flex-col text-center">
									<span class="text-sm text-gray-600">Price</span>
									<span>₱{item.price}</span>
								</div>

								<div class="flex flex-col text-center">
									<span class="text-sm text-gray-600">Qty</span>
									<span>{item.quantity}</span>
								</div>
							</div>
						{/each}

						<!-- Display order total -->
						<div class="mt-2 text-right font-semibold">
							Total: ₱{order.orderTotal}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
