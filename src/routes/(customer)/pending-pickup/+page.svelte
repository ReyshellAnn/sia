<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';

	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';
	import { user } from '$lib/stores/authStore';

	import * as Card from '$lib/components/ui/card/index.js';

	let pickupOrders: any[] = [];
	let loading = true;
	let totalPrice = 0;

	onMount(async () => {
		const currentUser = get(user); // Get the authenticated user
		if (!currentUser) return; // Should never happen due to +page.ts

		try {
			// Query all pickup orders for the current user
			const q = query(collection(db, 'pickup'), where('userId', '==', currentUser.uid));
			const querySnapshot = await getDocs(q);

			// Process the pickup orders
			pickupOrders = querySnapshot.docs.map((doc) => {
				const data = doc.data();
				const items = data.items || []; // Ensure items array exists

				// Calculate total price per order
				const orderTotal = items.reduce(
					(sum: number, item: { price: number; quantity: number }) =>
						sum + item.price * item.quantity,
					0
				);

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
		} finally {
			loading = false;
		}
	});
</script>

<div class="container p-6 bg-primary-foreground shadow-none rounded-none border-none min-h flex flex-col">
	<span class="text-2xl font-semibold">📦 Pending Pickups</span>

	{#if loading}
		<div class="text-center text-lg text-gray-500 mt-4">Loading...</div>
	{:else}
		<div class="text-sm font-light text-gray-600 mt-4">
			<span class="text-sm font-light text-gray-600">
				Please have your payment ready upon pickup. Show your order ID at the counter. Orders not
				picked up promptly may be subject to cancellation at the pharmacy's discretion.
			</span>
		</div>

		<!-- Display Pickup Orders -->
		<div class="flex flex-col gap-6 mt-8 ">
			{#each pickupOrders as order}
				<Card.Root class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
					<Card.Content>
						<div class="flex flex-col gap-2 p-4">
							<span class="text-lg font-semibold text-gray-700"><span class="font-normal text-sm">Order ID:</span> #{order.id.replace("pickup_", "")}</span>
							<span class="text-base font-semibold text-gray-700"><span class="font-normal text-sm">Pickup Time:</span> {order.pickupTime}</span>

							<!-- Display each item in the order -->
							{#each order.items as item}
							<div class="flex items-center justify-between border-b border-gray-300 pb-4">
								<!-- Item Image & Name -->
								<div class="flex flex-col lg:flex-row items-center space-x-4 flex-1">
									<img src={item.imageUrl} alt={item.name} class="w-20 object-cover rounded-md"/>
									<span class="text-sm text-gray-700 font-semibold">{item.name}</span>
								</div>
							
								<!-- Quantity Column -->
								<div class="flex flex-col items-center flex-1">
									<span class="text-xs text-gray-500">Qty</span>
									<span class="text-sm text-gray-700 font-semibold">{item.quantity}</span>
								</div>
							
								<!-- Price Column -->
								<div class="flex flex-col items-center flex-1">
									<span class="text-xs text-gray-500">Price</span>
									<span class="text-sm text-gray-700 font-semibold">₱{item.price}</span>
								</div>
							</div>
							
							{/each}

							<!-- Display order total -->
							<div class="flex justify-end items-center mt-4">
								<span class="text-lg font-semibold text-gray-600">Total:
								<span class="text-lg font-semibold text-green-700">₱{order.orderTotal}</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
