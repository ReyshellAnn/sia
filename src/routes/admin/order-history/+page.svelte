<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs } from 'firebase/firestore'; // Import Firestore functions
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore references
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';

	const isDesktop = new MediaQuery('(min-width: 768px)');

	const count = 20;
	const perPage = $derived(isDesktop.current ? 3 : 8);
	const siblingCount = $derived(isDesktop.current ? 1 : 0);

	// Define a type for the order history data
	interface OrderHistory {
		imageUrl: string | null | undefined;
		id: string;
		medicineId: string;
		name: string;
		price: number;
		quantity: number;
		status: string;
		createdAt: string;
		completedAt: string;
		fullName: string;
		userId: string;
	}

	// Declare reactive variables
	let isAuthorized = $state(false); // Track if the user is authorized
	let errorMessage = $state(''); // Handle errors
	let orders = $state<OrderHistory[]>([]); // Store order history data from Firestore
	let selectedRow: OrderHistory | null = null; // Track the selected row
	let isLoading = $state(false); // Loading state

	onMount(async () => {
		// Check if the user is authenticated
		onAuthStateChanged(auth, async (user) => {
			if (!user) {
				console.log('No user is authenticated. Redirecting to homepage.');
				window.location.href = '/'; // Redirect to homepage
				return;
			}

			try {
				// Get user role from Firestore
				const userDocRef = doc(db, 'users', user.uid);
				const userDoc = await getDoc(userDocRef);

				if (userDoc.exists()) {
					const userData = userDoc.data();

					// Check if the user is an admin
					if (userData?.role !== 'admin') {
						console.log('User is not an admin. Redirecting to homepage.');
						window.location.href = '/'; // Redirect to homepage
					} else {
						console.log('User is authenticated as an admin.');
						isAuthorized = true; // Allow access to admin content

						// Fetch order history data from Firestore
						const querySnapshot = await getDocs(collection(db, 'orderhistory'));
						orders = querySnapshot.docs.map((doc) => ({
							id: doc.id, // Include the document ID
							...doc.data() // Spread the document data
						})) as OrderHistory[];
					}
				} else {
					console.error('User document not found in Firestore.');
					window.location.href = '/login'; // Redirect to login
				}
			} catch (error) {
				console.error('Error fetching user role or order history:', error);
				errorMessage = 'An error occurred while fetching data.';
				window.location.href = '/'; // Fallback to homepage
			}
		});
	});
</script>

<!-- Render content only if the user is authorized -->
{#if isAuthorized}
	<header class="flex flex-row justify-between px-2">
		<span class="text-2xl font-semibold">Order History</span>
	</header>

	<Table.Root>
		<Table.Header>
			<Table.Row>
				<!-- <Table.Head>Order ID</Table.Head> -->
				<Table.Head>Name</Table.Head>
				<Table.Head>Price</Table.Head>
				<Table.Head>Quantity</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Date</Table.Head>
				<Table.Head>Customer</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each orders as order (order.id)}
				<Table.Row>
					<!-- <Table.Cell class="font-medium">{order.id}</Table.Cell> -->
					<Table.Cell>
						<img src="{order.imageUrl}" alt="Order" class="w-16 h-16 object-cover rounded" />
						{order.name}
					</Table.Cell>
					<Table.Cell>₱{order.price.toFixed(2)}</Table.Cell>
					<Table.Cell>{order.quantity}</Table.Cell>
					<Table.Cell>{order.status}</Table.Cell>
					<Table.Cell>{new Date(order.createdAt).toLocaleString()}</Table.Cell>
					<Table.Cell>{order.fullName}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

	<Pagination.Root {count} {perPage} {siblingCount} class="items-end">
		{#snippet children({ pages, currentPage })} 
			<Pagination.Content>
				<Pagination.Item>
					<Pagination.PrevButton>
						<ChevronLeft class="size-4" />
						<span class="hidden sm:block">Previous</span>
					</Pagination.PrevButton>
				</Pagination.Item>
				{#each pages as page (page.key)}
					{#if page.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else}
						<Pagination.Item>
							<Pagination.Link {page} isActive={currentPage === page.value}>
								{page.value}
							</Pagination.Link>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item>
					<Pagination.NextButton>
						<span class="hidden sm:block">Next</span>
						<ChevronRight class="size-4" />
					</Pagination.NextButton>
				</Pagination.Item>
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message if any -->
{/if}
