<script lang="ts">
	import { onMount } from 'svelte';
	import {
		doc,
		getDoc,
		query,
		collection,
		getDocs,
		deleteDoc,
		setDoc,
		where
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state
	import { goto } from '$app/navigation'; // For navigation
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	let isAuthorized = false;
	let pickupItems: any[] = [];
	let errorMessage = '';
	let cancelReason = '';

	// Fetch pickup items and check user authorization
	onMount(() => {
		onAuthStateChanged(auth, async (user) => {
			if (!user) {
				console.log('No user is authenticated. Redirecting to homepage.');
				window.location.href = '/'; // Redirect to homepage
				return;
			}

			try {
				const userDocRef = doc(db, 'users', user.uid);
				const userDoc = await getDoc(userDocRef);

				if (userDoc.exists()) {
					const userData = userDoc.data();

					if (userData?.role !== 'admin') {
						console.log('User is not an admin. Redirecting to homepage.');
						window.location.href = '/'; // Redirect to homepage or other page
					} else {
						console.log('User is authenticated as an admin.');
						isAuthorized = true; // Allow access to admin content
						fetchPickupItems(); // Fetch pickup items after authorization
					}
				} else {
					console.error('User document not found in Firestore.');
					window.location.href = '/login'; // Redirect to login if user doc not found
				}
			} catch (error) {
				console.error('Error fetching user role:', error);
				errorMessage = 'An error occurred while checking user role.';
				window.location.href = '/'; // Fallback to homepage if error occurs
			}
		});
	});

	interface PickupItem {
		id: string;
		userId?: string; // Make userId optional, as it will be fetched later
		profileImageUrl?: string;
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
                    // Add profileImageUrl to the pickup item
                    pickupItem.profileImageUrl = userData?.profileImageUrl || 'https://placehold.co/50x50';
                }
            }
        }

        // Group orders by user
        pickupItems = groupOrdersByUser(fetchedPickupItems);
    });
};


	// Group orders by userId
	const groupOrdersByUser = (items: any[]) => {
		const groupedOrders: { [key: string]: any[] } = {};

		items.forEach((item) => {
			if (!groupedOrders[item.userId]) {
				groupedOrders[item.userId] = [];
			}
			groupedOrders[item.userId].push(item);
		});

		return Object.entries(groupedOrders).map(([userId, orders]) => ({
			userId,
			orders,
			fullName: orders[0]?.fullName // Assuming fullName is the same for all orders from a user
		}));
	};

	// Mark all orders for a user as completed
	const markAllAsCompleted = async (userId: string) => {
		try {
			const userOrders = pickupItems.find((user) => user.userId === userId)?.orders;
			if (userOrders) {
				for (let order of userOrders) {
					const orderRef = doc(db, 'pickup', order.id);
					const orderSnapshot = await getDoc(orderRef);

					if (orderSnapshot.exists()) {
						const orderData = orderSnapshot.data();
						const orderHistoryRef = doc(db, 'orderhistory', order.id);

						await setDoc(orderHistoryRef, {
							...orderData,
							status: 'completed',
							completedAt: new Date()
						});

						await deleteDoc(orderRef); // Delete from pickup collection
					}
				}
				fetchPickupItems(); // Refresh list after marking orders as completed
			}
		} catch (error) {
			console.error('Error marking orders as completed:', error);
		}
	};

	// Cancel all orders for a user
	const cancelAllOrders = async (userId: string) => {
		try {
			const userOrders = pickupItems.find((user) => user.userId === userId)?.orders;
			if (userOrders) {
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
			}
		} catch (error) {
			console.error('Error cancelling orders:', error);
		}
	};
</script>

{#if isAuthorized}
	<div class="admin-dashboard space-y-2">
		<span class="text-2xl font-semibold">Pickup list</span>

		{#if pickupItems.length === 0}
			<p>No pickup orders available.</p>
		{:else}
			<div class="pickup-items flex flex-col gap-4 sm:flex-row sm:flex-wrap">
				{#each pickupItems as user}
					<Card.Root class="pickup-item w-full min-w-[300px] max-w-[300px]">
						<Card.Content class="space-y-4 p-3">
							<div class="flex flex-row justify-between">
								<div class="flex flex-col">
									<span class="text-sm font-medium">{user.fullName}</span>
									<span class="text-xs text-gray-500"
										>Pickup Time: {user.orders[0]?.pickupTime || 'N/A'}</span
									>
								</div>

								<Avatar.Root>
									<Avatar.Image
										src={user.orders[0]?.profileImageUrl || 'https://placehold.co/50x50'}
										alt={user.fullName || 'User Avatar'}
									/>
									<Avatar.Fallback>{user.fullName ? user.fullName.charAt(0) : 'U'}</Avatar.Fallback>
								</Avatar.Root>
							</div>
							<ScrollArea class="h-36">
								<div class="space-y-2">
									<!-- Add space between items -->
									{#each user.orders as order}
										<div class="flex flex-row">
											<div>
												<!-- Only add alt text if it provides meaningful information -->
												<img
													src={order.imageUrl || 'https://placehold.co/50x50'}
													alt={order.name || 'Order Image'}
													class="w-16 rounded-full object-cover"
												/>
											</div>
											<div class="flex flex-1 flex-col p-2">
												<span class="text-sm font-medium">{order.name}</span>
												<div class="flex justify-between text-sm">
													<span class=" text-xs text-gray-500">₱{order.price} </span>
													<span class=" text-xs text-gray-500">Qty: {order.quantity}</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</ScrollArea>

							<Separator class="mb-2" />
							<div class="mt-auto flex flex-row">
								<div class="flex flex-1 flex-col">
									<span class="text-xs text-gray-500">X{user.orders.length} items</span>
									<span class="text-sm font-medium"
										>₱{user.orders.reduce(
											(total: number, order: { price: number; quantity: number }) =>
												total + order.price * order.quantity,
											0
										)}</span
									>
								</div>
								<div class="space-x-2">
									<Button
										onclick={() => markAllAsCompleted(user.userId)}
										variant="outline"
										class="text-green-500 hover:text-green-500"><Check /></Button
									>
									<Button
										onclick={() => cancelAllOrders(user.userId)}
										variant="outline"
										class="text-red-500 hover:text-red-500"><X /></Button
									>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message -->
{/if}
