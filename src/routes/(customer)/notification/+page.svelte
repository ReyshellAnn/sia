<script lang="ts">
	import { onMount } from 'svelte';
	import {
		collection,
		getDocs,
		query,
		where
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as Card from '$lib/components/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import Clock from 'lucide-svelte/icons/clock';
	import XCircle from 'lucide-svelte/icons/circle-x';
	import CheckCircle from 'lucide-svelte/icons/circle-check';

	let user;
	let pickupNotifications: any[] = [];

	onMount(() => {
		onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				goto('/login');
				return;
			}

			user = currentUser;

			// Fetch order notifications based on status
			try {
				// Query for orders where userId matches and status is 'cancelled' or 'completed'
				const q = query(
					collection(db, 'orderhistory'),
					where('userId', '==', user.uid),
					where('status', 'in', ['completed', 'cancelled'])
				);
				const querySnapshot = await getDocs(q);

				// Map the fetched data to the notification structure
				pickupNotifications = querySnapshot.docs.map((doc) => {
					const order = doc.data();
					return {
						id: doc.id,
						status: order.status,
						createdAt: order.createdAt,
						canceledAt: order.cancelledAt,
						items: order.items,
					};
				});

				console.log('Pickup Notifications:', pickupNotifications);
			} catch (error) {
				console.error('Error fetching pickup notifications:', error);
			}
		});
	});
</script>

<div class="flex flex-wrap gap-12">
	<div class="flex flex-[2] flex-col">
		<span class="text-2xl font-semibold mb-2">Notifications</span>
		<Card.Root>
			<Card.Content>
				{#if pickupNotifications.length > 0}
					{#each pickupNotifications as pickup}
						<div class="flex flex-col border-2 rounded-lg p-6 shadow-sm mt-4 {pickup.status === 'cancelled' ? 'border-red-500' : 'border-green-500'}">
							<div class="flex justify-between items-center">
								<span class="font-semibold text-lg flex items-center gap-2">
									{#if pickup.status === 'cancelled'}
										<XCircle class="text-red-500" size={20} /> Pickup Cancelled
									{:else}
										<CheckCircle class="text-green-500" size={20} /> Pickup Completed!
									{/if}
								</span>
								<span class="text-sm text-gray-500">{new Date(pickup.createdAt).toLocaleString()}</span>
							</div>
							<span class="text-gray-700 font-light mt-2">
								{#if pickup.status === 'cancelled'}
									Your pickup request was cancelled.
								{:else}
									Your order was picked up successfully.
								{/if}
							</span>
							<ul class="mt-2 text-gray-800 font-medium">
								{#each pickup.items as item}
									<li>{item.quantity}× {item.name}</li>
								{/each}
							</ul>
							<button class="mt-4 self-start {pickup.status === 'cancelled' ? 'bg-red-500' : 'bg-green-600'} text-white py-2 px-4 rounded-lg hover:bg-opacity-80 transition text-sm">
								View Order History
							</button>
						</div>
					{/each}
				{:else}
					<p class="text-center text-lg text-gray-500">No new notifications.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
