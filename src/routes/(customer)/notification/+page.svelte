<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { onAuthStateChanged } from 'firebase/auth';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/authStore';

	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';

	import * as Card from '$lib/components/ui/card/index.js';

	import Clock from 'lucide-svelte/icons/clock';
	import XCircle from 'lucide-svelte/icons/circle-x';
	import CheckCircle from 'lucide-svelte/icons/circle-check';

	let pickupNotifications: any[] = [];

	onMount(async () => {
	const currentUser = get(user);
	if (!currentUser) return; // Should never happen due to +page.ts

	try {
		const q = query(
			collection(db, 'orderhistory'),
			where('userId', '==', currentUser.uid),
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
				items: order.items
			};
		});

		console.log('Pickup Notifications:', pickupNotifications);
	} catch (error) {
		console.error('Error fetching pickup notifications:', error);
	}
});
</script>

<div class="flex flex-wrap gap-12">
	<div class="flex flex-[2] flex-col">
		<span class="mb-2 text-2xl font-semibold">Notifications</span>
		<Card.Root>
			<Card.Content>
				{#if pickupNotifications.length > 0}
					{#each pickupNotifications as pickup}
						<div
							class="mt-4 flex flex-col rounded-lg border-2 p-6 shadow-sm {pickup.status ===
							'cancelled'
								? 'border-red-500'
								: 'border-green-500'}"
						>
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-2 text-lg font-semibold">
									{#if pickup.status === 'cancelled'}
										<XCircle class="text-red-500" size={20} /> Pickup Cancelled
									{:else}
										<CheckCircle class="text-green-500" size={20} /> Pickup Completed!
									{/if}
								</span>
								<span class="text-sm text-gray-500"
									>{new Date(pickup.createdAt).toLocaleString()}</span
								>
							</div>
							<span class="mt-2 font-light text-gray-700">
								{#if pickup.status === 'cancelled'}
									Your pickup request was cancelled.
								{:else}
									Your order was picked up successfully.
								{/if}
							</span>
							<ul class="mt-2 font-medium text-gray-800">
								{#each pickup.items as item}
									<li>{item.quantity}× {item.name}</li>
								{/each}
							</ul>
							<button
								class="mt-4 self-start {pickup.status === 'cancelled'
									? 'bg-red-500'
									: 'bg-green-600'} rounded-lg px-4 py-2 text-sm text-white transition hover:bg-opacity-80"
							>
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
