<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { writable } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import {
		collection,
		query,
		orderBy,
		limit,
		startAfter,
		startAt,
		getDocs,
		doc,
		getDoc,
		Timestamp,
		QueryDocumentSnapshot,

		where

	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';

	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { user } from '$lib/stores/authStore';

	// Define order history interface
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

	const isDesktop = new MediaQuery('(min-width: 768px)');

	// **Pagination State**
	export const orders = writable<OrderHistory[]>([]);
	export const currentPage = writable(1);
	export const totalPages = writable(1);
	export const count = writable(0); // Total count of orders

	const siblingCount = $derived(isDesktop.current ? 1 : 0);

	let perPage = 5;
	let lastVisible: QueryDocumentSnapshot | null = null;
	let firstVisible: QueryDocumentSnapshot | null = null;
	let previousPages: QueryDocumentSnapshot[] = [];
	let isLoading = writable(false);

	// **Fetch total order count**
	const fetchTotalOrderCount = async () => {
    try {
        if (!$user) {
            console.warn('⚠️ No user logged in.');
            return;
        }

        const totalQuery = await getDocs(
            query(
                collection(db, 'orderhistory'),
                where('userId', '==', $user.uid) // ✅ Filter count by user
            )
        );

        count.set(totalQuery.size); // ✅ Update count correctly
        totalPages.set(Math.ceil(totalQuery.size / perPage)); // ✅ Update total pages correctly
    } catch (error) {
        console.error('Error fetching total order count:', error);
    }
};


	const fetchOrders = async (direction = 'next') => {
    console.log(`Fetching orders for user: ${$user?.uid}, direction = ${direction}`);
    isLoading.set(true);

    try {
        let q;

        if (!$user) {
            console.warn('⚠️ No user logged in. Skipping order fetch.');
            return;
        }

        if (direction === 'next') {
            q = lastVisible
                ? query(
                      collection(db, 'orderhistory'),
                      where('userId', '==', $user.uid), // ✅ Filter by current user
                      orderBy('createdAt', 'desc'),
                      startAfter(lastVisible),
                      limit(perPage)
                  )
                : query(
                      collection(db, 'orderhistory'),
                      where('userId', '==', $user.uid), // ✅ Filter by current user
                      orderBy('createdAt', 'desc'),
                      limit(perPage)
                  );

            if (firstVisible) {
                previousPages.push(firstVisible);
            }
        } else if (direction === 'prev' && previousPages.length > 0) {
            const previousLast = previousPages[previousPages.length - 1];

            if (previousPages.length > 1) {
                previousPages.pop();
            }

            q = query(
                collection(db, 'orderhistory'),
                where('userId', '==', $user.uid), // ✅ Filter by current user
                orderBy('createdAt', 'desc'),
                startAt(previousLast),
                limit(perPage)
            );
        } else {
            console.warn('⚠️ No previous pages to go back to.');
            return;
        }

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const fetchedOrders: OrderHistory[] = [];

            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();

                // Convert Firestore timestamps to readable dates
                const createdAt = data.createdAt
                    ? typeof data.createdAt === 'string'
                        ? new Date(data.createdAt).toLocaleString() // ✅ Handle ISO string
                        : data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate().toLocaleString() // ✅ Handle Firestore Timestamp
                        : 'N/A'
                    : 'N/A';
                const completedAt =
                    data.completedAt instanceof Timestamp
                        ? data.completedAt.toDate().toLocaleString()
                        : 'N/A';

                fetchedOrders.push({
                    id: docSnap.id,
                    items: data.items || [],
                    status: data.status || 'pending',
                    createdAt,
                    completedAt,
                    pickupTime: data.pickupTime || 'N/A',
                    userId: data.userId || '',
                    fullName: $user.fullName || 'Unknown User' // ✅ Use logged-in user's name
                });
            }

            orders.set(fetchedOrders);
            firstVisible = querySnapshot.docs[0];
            lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

            if (fetchedOrders.length < perPage && direction === 'next') {
                console.warn('⚠️ No more data to fetch.');
                return;
            }
        } else {
            console.warn('⚠️ Query returned empty. Stopping pagination.');
            return;
        }
    } catch (error) {
        console.error('Error fetching order history:', error);
    } finally {
        isLoading.set(false);
    }
};


	// **Pagination Controls**
	const nextPage = () => {
		if ($currentPage < $totalPages) {
			currentPage.update((n) => n + 1);
			fetchOrders('next');
		} else {
			console.warn('⚠️ Already on the last page.');
		}
	};

	const prevPage = () => {
		if (previousPages.length > 0) {
			currentPage.update((n) => Math.max(n - 1, 1));
			fetchOrders('prev');
		} else {
			console.warn('⚠️ No previous pages available.');
		}
	};

	const setPage = (page: number) => {
		if (page !== $currentPage) {
			currentPage.set(page);
			fetchOrders(page > $currentPage ? 'next' : 'prev');
		}
	};

	// **On Component Mount: Fetch Total Orders and First Page**
	onMount(async () => {
		await fetchTotalOrderCount(); // ✅ Fetch total count once
		fetchOrders('next');
	});
</script>

<div class="container mx-auto rounded-lg bg-white p-6 shadow-lg">
	<span class="text-2xl font-semibold p-2">🛎️ My Orders</span>


<div class="overflow-x-auto pt-2">
	<Table.Root
	>
		<Table.Header>
			<Table.Row>
				<Table.Head class="p-4 text-left font-semibold">Medicines</Table.Head>
				<Table.Head class="p-4 text-left font-semibold">Price</Table.Head>
				<Table.Head class="p-4 text-left font-semibold">Quantity</Table.Head>
				<Table.Head class="p-4 text-left font-semibold">Status</Table.Head>
				<Table.Head class="hidden p-4 text-left font-semibold sm:table-cell"
					>Date</Table.Head
				>
				<Table.Head class="p-4 text-left font-semibold">Pickup Time</Table.Head>
			</Table.Row>
		</Table.Header>

		<Table.Body class="rounded-xl p-0">
			{#each $orders as order (order.id)}
				<Table.Row
					class="transition-all duration-300 odd:bg-white/50 even:bg-gray-100/50 hover:bg-blue-100/50"
				>

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
										>{item.name}</span
									>
								</li>
							{/each}
						</ul>
					</Table.Cell>

					{#each order.items as item}
						<!-- Price Column -->
						<Table.Cell class="p-4 text-gray-700">₱{item.price.toFixed(2)}</Table.Cell>

						<!-- Quantity Column -->
						<Table.Cell class="p-4 text-gray-700">{item.quantity}</Table.Cell>
						{/each}
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
					<Table.Cell class="p-4 text-gray-700">{order.pickupTime}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<Pagination.Root count={$count} {perPage} {siblingCount} class="flex items-center justify-start">
	<Pagination.Content>
		<!-- Page Range Display -->
		<Pagination.Item>
			<span class="px-4 text-sm font-medium">
				{($currentPage - 1) * perPage + 1}-
				{Math.min($currentPage * perPage, $count)}
				of {$count}
			</span>
		</Pagination.Item>

		<!-- Previous Button -->
		<Pagination.Item>
			<button
				onclick={() => prevPage()}
				disabled={$currentPage <= 1 || previousPages.length === 0}
				class="group flex items-center gap-2 rounded-lg px-3
			py-1.5 hover:bg-gray-200
			disabled:pointer-events-none disabled:opacity-50"
			>
				<ChevronLeft class="size-4" />
			</button>
		</Pagination.Item>

		<!-- Next Button -->
		<Pagination.Item>
			<button
				onclick={() => nextPage()}
				disabled={$currentPage >= $totalPages || !$totalPages}
				class="group flex items-center gap-2 rounded-lg px-3
			py-1.5 hover:bg-gray-200
			disabled:pointer-events-none disabled:opacity-50"
			>
				<ChevronRight class="size-4" />
			</button>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>

</div>