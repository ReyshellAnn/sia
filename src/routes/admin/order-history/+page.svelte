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
	<header class="flex justify-between items-center px-6 py-4 bg-blue-50/50 shadow-md rounded-lg">
		<h1 class="text-2xl font-bold text-gray-800">📜 Order History</h1>
	</header>

	<div class="overflow-x-auto p-6">
		<Table.Root 
			class="w-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl bg-white/90 backdrop-blur-sm">
			
			<Table.Header class="bg-gray-100 text-gray-700">
				<Table.Row>
					<Table.Head class="p-4 text-left font-semibold">👤 Customer</Table.Head>
					<Table.Head class="p-4 text-left font-semibold">📦 Items</Table.Head>
					<Table.Head class="p-4 text-left font-semibold">🔄 Status</Table.Head>
					<Table.Head class="p-4 text-left font-semibold hidden sm:table-cell">📅 Created At</Table.Head>
					<Table.Head class="p-4 text-left font-semibold hidden sm:table-cell">✅ Completed At</Table.Head>
					<Table.Head class="p-4 text-left font-semibold">⏳ Pickup Time</Table.Head>
				</Table.Row>
			</Table.Header>
	
			<Table.Body>
				{#each orders as order (order.id)}
					<Table.Row class="transition-all duration-300 even:bg-gray-100/50 odd:bg-white/50 hover:bg-blue-100/50">
						<Table.Cell class="p-4 font-medium text-gray-900">{order.fullName}</Table.Cell>
	
						<Table.Cell class="p-4">
							<ul class="space-y-2">
								{#each order.items as item}
									<li class="flex items-center gap-3">
										<img src={item.imageUrl} alt={item.name} class="h-12 w-12 rounded-lg shadow-sm border border-gray-200" />
										<span class="text-gray-700 text-sm">{item.name} (₱{item.price.toFixed(2)} x {item.quantity})</span>
									</li>
								{/each}
							</ul>
						</Table.Cell>
	
						<Table.Cell class="p-4">
							<span 
								class={`px-4 py-1 rounded-full text-xs font-semibold shadow-md transition-all duration-300
									${order.status === 'Pending' ? 'bg-yellow-400/80 text-black' : ''}
									${order.status === 'Completed' ? 'bg-green-500/80 text-white' : ''}
									${order.status === 'Cancelled' ? 'bg-red-500/80 text-white' : ''}`}>
								{order.status}
							</span>
						</Table.Cell>
	
						<Table.Cell class="p-4 text-gray-700 hidden sm:table-cell">{order.createdAt}</Table.Cell>
						<Table.Cell class="p-4 text-gray-700 hidden sm:table-cell">{order.completedAt}</Table.Cell>
						<Table.Cell class="p-4 text-gray-700">{order.pickupTime}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- ✅ Style for table effect -->
	<style>
		.pending { background-color: #facc15b3; color: black; }
		.completed { background-color: #16a34ab3; color: white; }
		.cancelled { background-color: #dc2626b3; color: white; }

		@keyframes fadeIn {
			from { opacity: 0; transform: translateY(10px); }
			to { opacity: 1; transform: translateY(0); }
		}

		Table.Row {
			animation: fadeIn 0.4s ease-in-out;
			transition: transform 0.3s ease-in-out;
		}

		Table.Row:hover {
			transform: scale(1.02);
		}
	</style>

{:else if errorMessage}
	<p class="text-red-600 text-center mt-4">{errorMessage}</p>
{/if}

