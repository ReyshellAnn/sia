<script lang="ts">
	import { onMount } from 'svelte';

	import {
		doc,
		getDoc,
		query,
		collection,
		updateDoc,
		deleteDoc,
		setDoc,
		increment
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state

	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';

	let isAuthorized = false;
	let pickupItems: any[] = [];
	let errorMessage = '';
	let cancelReason = '';

	// Fetch pickup items
	onMount(() => {
		fetchPickupItems(); // ✅ No need to check auth—layout.ts already does it
	});

	interface PickupItem {
		id: string;
		userId?: string; // Make userId optional, as it will be fetched later
		profileImageUrl?: string;
		items: any[]; // Pickup items array
		[key: string]: any; // Allow for any additional fields in the pickup item
	}

	import { onSnapshot } from 'firebase/firestore';

	const fetchPickupItems = () => {
		const q = query(collection(db, 'pickup'));

		// Real-time listener for pickup collection
		onSnapshot(q, async (querySnapshot) => {
			const fetchedPickupItems: PickupItem[] = querySnapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					userId: data.userId,
					items: data.items || [],
					fullName: '', // Initialize fullName as empty
					...data
				};
			});

			// Fetch user data for each pickup item
			for (let pickupItem of fetchedPickupItems) {
				if (pickupItem.userId) {
					// Only attempt to fetch user data if userId exists
					const userDocRef = doc(db, 'users', pickupItem.userId);
					const userDoc = await getDoc(userDocRef);

					if (userDoc.exists()) {
						const userData = userDoc.data();
						// Add fullName and profileImageUrl to the pickup item
						pickupItem.fullName = userData?.fullName || 'Unknown Name';
						pickupItem.profileImageUrl = userData?.profileImageUrl || 'https://placehold.co/50x50';
					}
				}
			}

			pickupItems = fetchedPickupItems;
		});
	};

	// Mark all orders for a user as completed
	const markAllAsCompleted = async (userId: string) => {
		try {
			const userOrders = pickupItems.filter((item) => item.userId === userId);

			for (let order of userOrders) {
				const orderRef = doc(db, 'pickup', order.id);
				const orderSnapshot = await getDoc(orderRef);

				if (orderSnapshot.exists()) {
					const orderData = orderSnapshot.data();
					const orderHistoryRef = doc(db, 'orderhistory', order.id);

					// Reduce stock for each item in the order
					for (let item of orderData.items) {
						const medicineRef = doc(db, 'medicines', item.medicineId);
						const medicineSnapshot = await getDoc(medicineRef);

						if (medicineSnapshot.exists()) {
							const currentStock = medicineSnapshot.data().stock || 0;
							const newStock = Math.max(0, currentStock - item.quantity); // Ensure stock never goes below 0

							await updateDoc(medicineRef, {
								stock: newStock
							});
						}
					}

					// Move order to order history with status "completed"
					await setDoc(orderHistoryRef, {
						...orderData,
						status: 'completed',
						completedAt: new Date()
					});

					// Delete from pickup collection
					await deleteDoc(orderRef);
				}
			}

			fetchPickupItems(); // Refresh list after marking orders as completed
		} catch (error) {
			console.error('Error marking orders as completed:', error);
		}
	};

	// Cancel all orders for a user
	const cancelAllOrders = async (userId: string) => {
		try {
			const userOrders = pickupItems.filter((item) => item.userId === userId);
			for (let order of userOrders) {
				const orderRef = doc(db, 'pickup', order.id);
				const orderSnapshot = await getDoc(orderRef);

				if (orderSnapshot.exists()) {
					const orderData = orderSnapshot.data();
					const orderHistoryRef = doc(db, 'orderhistory', order.id);

					await setDoc(orderHistoryRef, {
						...orderData,
						status: 'cancelled',
						cancelledAt: new Date()
					});

					await deleteDoc(orderRef); // Delete from pickup collection
				}
			}
			fetchPickupItems(); // Refresh list after cancelling orders
		} catch (error) {
			console.error('Error cancelling orders:', error);
		}
	};
</script>

<div class="admin-dashboard space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
	<span class="text-2xl font-semibold text-gray-800">📦 Pickup List</span>

	{#if pickupItems.length === 0}
		<p class="text-gray-600">No pickup orders available.</p>
	{:else}
		<div class="pickup-items flex flex-col gap-2 sm:flex-row sm:flex-wrap">
			{#each pickupItems as pickupItem (pickupItem.id)}
				<Card.Root
					class="pickup-item w-full max-w-sm overflow-hidden rounded-xl border border-gray-300 bg-gray-50 shadow-md"
				>
					<Card.Content class="space-y-4 p-4">
						<div class="flex items-center justify-between">
							<div class="flex flex-col">
								<span class="text-sm font-normal text-gray-800">Order ID:</span>
								<span class="text-sm font-medium text-gray-800">#{pickupItem.id.replace("pickup_", "")}</span>
								<span class="text-xs font-normal text-gray-500">{pickupItem.fullName}</span>
								<span class="text-xs text-gray-500"
									>Pickup Time: {pickupItem.pickupTime || 'N/A'}</span
								>
							</div>
							<Avatar.Root>
								<Avatar.Image
									src={pickupItem.profileImageUrl || 'https://placehold.co/50x50'}
									alt={pickupItem.fullName || 'User Avatar'}
									class="h-10 w-10 rounded-full border border-gray-300 shadow-sm"
								/>
								<Avatar.Fallback
									>{pickupItem.fullName ? pickupItem.fullName.charAt(0) : 'U'}</Avatar.Fallback
								>
							</Avatar.Root>
						</div>

						<ScrollArea class="h-36 px-2">
							<div class="space-y-3">
								{#each pickupItem.items as item}
									<div
										class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
									>
										<img
											src={item.imageUrl || 'https://placehold.co/50x50'}
											alt={item.name || 'Order Image'}
											class="h-12 w-12 rounded-lg border border-gray-300 object-cover"
										/>
										<div class="flex flex-1 flex-col">
											<span class="text-sm font-medium text-gray-800">{item.name}</span>
											<div class="flex justify-between text-xs text-gray-500">
												<span>₱{item.price}</span>
												<span>Qty: {item.quantity}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</ScrollArea>

						<Separator class="my-2 border-gray-300" />

						<div class="flex items-center justify-between">
							<div class="flex flex-col">
								<span class="text-xs text-gray-500">{pickupItem.items.length} items</span>
								<span class="text-sm font-semibold text-gray-800">
									₱ {pickupItem.items.reduce(
										(total: number, order: { price: number; quantity: number }) =>
											total + order.price * order.quantity,
										0
									)}
								</span>
							</div>
							<div class="space-x-2">
								<Button
									onclick={() => markAllAsCompleted(pickupItem.userId)}
									variant="outline"
									class="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
									><Check /></Button
								>
								<Button
									onclick={() => cancelAllOrders(pickupItem.userId)}
									variant="outline"
									class="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
									><X /></Button
								>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
