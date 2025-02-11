<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
	import { auth, db } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';

	import * as Table from '$lib/components/ui/table/index.js';

	const isDesktop = new MediaQuery('(min-width: 768px)');

	interface OrderItem {
		imageUrl: string;
		medicineId: string;
		name: string;
		price: number;
		quantity: number;
	}

	interface OrderHistory {
		id: string;
		items: OrderItem[];
		status: string;
		createdAt: string;
		completedAt: string;
		pickupTime: string;
		userId: string;
		fullName: string;
	}

	let isAuthorized = $state(false);
	let errorMessage = $state('');
	let orders = $state<OrderHistory[]>([]);
	let isLoading = $state(false);

	onMount(async () => {
		onAuthStateChanged(auth, async (user) => {
			if (!user) {
				console.log('No user is authenticated. Redirecting to homepage.');
				window.location.href = '/';
				return;
			}

			try {
				isLoading = true;

				const querySnapshot = await getDocs(collection(db, 'orderhistory'));
				const fetchedOrders: OrderHistory[] = [];

				for (const docSnap of querySnapshot.docs) {
					const data = docSnap.data();

					// Convert timestamps to readable format
					const createdAt = data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A';
					const completedAt =
						data.completedAt instanceof Timestamp
							? data.completedAt.toDate().toLocaleString()
							: 'N/A';

					// Fetch user details
					let fullName = 'Unknown User';
					if (data.userId) {
						const userDocRef = doc(db, 'users', data.userId);
						const userDoc = await getDoc(userDocRef);
						if (userDoc.exists()) {
							fullName = userDoc.data().fullName || 'Unknown User';
						}
					}

					fetchedOrders.push({
						id: docSnap.id,
						items: data.items || [],
						status: data.status || 'pending',
						createdAt,
						completedAt,
						pickupTime: data.pickupTime || 'N/A',
						userId: data.userId || '',
						fullName
					});
				}

				orders = fetchedOrders;
				isAuthorized = true;
			} catch (error) {
				console.error('Error fetching order history:', error);
				errorMessage = 'An error occurred while fetching data.';
			} finally {
				isLoading = false;
			}
		});
	});
</script>

{#if isAuthorized}
	<header class="flex flex-row justify-between px-2">
		<span class="text-2xl font-semibold">Order History</span>
	</header>

	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Customer</Table.Head>
				<Table.Head>Items</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Created At</Table.Head>
				<Table.Head>Completed At</Table.Head>
				<Table.Head>Pickup Time</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each orders as order (order.id)}
				<Table.Row>
					<Table.Cell>{order.fullName}</Table.Cell>
					<Table.Cell>
						<ul>
							{#each order.items as item}
								<li class="flex items-center gap-2">
									<img src={item.imageUrl} alt={item.name} class="h-12 w-12 rounded" />
									<span>{item.name} (₱{item.price.toFixed(2)} x {item.quantity})</span>
								</li>
							{/each}
						</ul>
					</Table.Cell>
					<Table.Cell>{order.status}</Table.Cell>
					<Table.Cell>{order.createdAt}</Table.Cell>
					<Table.Cell>{order.completedAt}</Table.Cell>
					<Table.Cell>{order.pickupTime}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
{/if}
