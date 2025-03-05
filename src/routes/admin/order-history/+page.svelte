<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';

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
		} catch (error) {
			console.error('Error fetching order history:', error);
			errorMessage = 'An error occurred while fetching data.';
		} finally {
			isLoading = false;
		}
	});
</script>

<header class="flex items-center justify-between rounded-lg bg-blue-50/50 px-6 py-4 shadow-md">
	<h1 class="text-2xl font-bold text-gray-800">📜 Order History</h1>
</header>

<div class="overflow-x-auto p-6">
	<Table.Root
		class="w-full rounded-xl bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
	>
		<Table.Header class="bg-gray-100 text-gray-700">
			<Table.Row>
				<Table.Head class="p-4 text-left font-semibold">👤 Customer</Table.Head>
				<Table.Head class="p-4 text-left font-semibold">📦 Items</Table.Head>
				<Table.Head class="p-4 text-left font-semibold">🔄 Status</Table.Head>
				<Table.Head class="hidden p-4 text-left font-semibold sm:table-cell"
					>📅 Created At</Table.Head
				>
				<Table.Head class="hidden p-4 text-left font-semibold sm:table-cell"
					>✅ Completed At</Table.Head
				>
				<Table.Head class="p-4 text-left font-semibold">⏳ Pickup Time</Table.Head>
			</Table.Row>
		</Table.Header>

		<Table.Body>
			{#each orders as order (order.id)}
				<Table.Row
					class="transition-all duration-300 odd:bg-white/50 even:bg-gray-100/50 hover:bg-blue-100/50"
				>
					<Table.Cell class="p-4 font-medium text-gray-900">{order.fullName}</Table.Cell>

					<Table.Cell class="p-4">
						<ul class="space-y-2">
							{#each order.items as item}
								<li class="flex items-center gap-3">
									<img
										src={item.imageUrl}
										alt={item.name}
										class="h-12 w-12 rounded-lg border border-gray-200 shadow-sm"
									/>
									<span class="text-sm text-gray-700"
										>{item.name} (₱{item.price.toFixed(2)} x {item.quantity})</span
									>
								</li>
							{/each}
						</ul>
					</Table.Cell>

					<Table.Cell class="p-4">
						<span
							class={`rounded-full px-4 py-1 text-xs font-semibold shadow-md transition-all duration-300
									${order.status === 'Pending' ? 'bg-yellow-400/80 text-black' : ''}
									${order.status === 'Completed' ? 'bg-green-500/80 text-white' : ''}
									${order.status === 'Cancelled' ? 'bg-red-500/80 text-white' : ''}`}
						>
							{order.status}
						</span>
					</Table.Cell>

					<Table.Cell class="hidden p-4 text-gray-700 sm:table-cell">{order.createdAt}</Table.Cell>
					<Table.Cell class="hidden p-4 text-gray-700 sm:table-cell">{order.completedAt}</Table.Cell
					>
					<Table.Cell class="p-4 text-gray-700">{order.pickupTime}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<!-- ✅ Style for table effect -->
<style>
	.pending {
		background-color: #facc15b3;
		color: black;
	}
	.completed {
		background-color: #16a34ab3;
		color: white;
	}
	.cancelled {
		background-color: #dc2626b3;
		color: white;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	Table.Row {
		animation: fadeIn 0.4s ease-in-out;
		transition: transform 0.3s ease-in-out;
	}

	Table.Row:hover {
		transform: scale(1.02);
	}
</style>
