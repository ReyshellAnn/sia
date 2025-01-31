<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
    import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs, deleteDoc } from 'firebase/firestore'; // Import Firestore functions
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

	const isDesktop = new MediaQuery('(min-width: 768px)');

	const count = 20;
	const perPage = $derived(isDesktop.current ? 3 : 8);
	const siblingCount = $derived(isDesktop.current ? 1 : 0);

	// Define a type for the medicine data
	interface Medicine {
		id: string;
		name: string;
		category: string;
		description: string;
		price: number;
		stock: number;
		imageUrl?: string;
	}

	// Declare reactive variables
	let isAuthorized = $state(false); // Track if the user is authorized
	let errorMessage = $state(''); // Handle errors
	let medicines = $state<Medicine[]>([]); // Store medicines data from Firestore
	let selectedRow: Medicine | null = null; // Track the selected row
	let isLoading = $state(false); // Loading state
	let isDeleteDialogOpen = $state(false); // Controls the alert dialog

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

						// Fetch medicines data from Firestore
						const querySnapshot = await getDocs(collection(db, 'medicines'));
						medicines = querySnapshot.docs.map((doc) => ({
							id: doc.id, // Include the document ID
							...doc.data() // Spread the document data
						})) as Medicine[];
					}
				} else {
					console.error('User document not found in Firestore.');
					window.location.href = '/login'; // Redirect to login
				}
			} catch (error) {
				console.error('Error fetching user role or medicines:', error);
				errorMessage = 'An error occurred while fetching data.';
				window.location.href = '/'; // Fallback to homepage
			}
		});
	});

	// Delete the selected row
	const deleteRow = async (medicine: Medicine) => {
		try {
			isLoading = true;

			// Delete medicine from Firestore
			const medicineRef = doc(db, 'medicines', medicine.id);
			await deleteDoc(medicineRef);

			// Remove medicine from local state
			medicines = medicines.filter((m) => m.id !== medicine.id);

			// Close the dialog
			isDeleteDialogOpen = false;

			// Show success toast
			toast.success(`${medicine.name} has been deleted successfully.`);
		} catch (error) {
			console.error('Error deleting medicine:', error);
			errorMessage = 'Failed to delete the medicine.';

			// Show error toast
			toast.error('An error occurred while deleting the medicine.');
		} finally {
			isLoading = false;
		}
	};

	// Open dialog and set selected row
	const openDeleteDialog = (medicine: Medicine) => {
		selectedRow = medicine;
		isDeleteDialogOpen = true;
	};
</script>

<!-- Render content only if the user is authorized -->
{#if isAuthorized}
	<header class="flex flex-row justify-between px-2">
		<span class="text-2xl font-semibold">Inventory List</span>
		<div class="flex flex-row space-x-2">
			<Input type="search" placeholder="Search Medicine" class="w-sm" />
			<Button href="/admin/inventory/add"><Plus />Add Medicine</Button>
		</div>
	</header>

	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Name</Table.Head>
				<Table.Head>Category</Table.Head>
				<Table.Head>Description</Table.Head>
				<Table.Head>Price</Table.Head>
				<Table.Head>Stock</Table.Head>
				<Table.Head>Image</Table.Head>
				<Table.Head>Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each medicines as medicine (medicine.id)}
				<Table.Row>
					<Table.Cell class="font-medium">{medicine.name}</Table.Cell>
					<Table.Cell>{medicine.category}</Table.Cell>
					<Table.Cell>{medicine.description}</Table.Cell>
					<Table.Cell>${medicine.price.toFixed(2)}</Table.Cell>
					<Table.Cell>{medicine.stock}</Table.Cell>
					<Table.Cell>
						{#if medicine.imageUrl}
							<img src={medicine.imageUrl} alt={medicine.name} class="h-10 w-10 rounded" />
						{:else}
							No Image
						{/if}
					</Table.Cell>
					<Table.Cell>
						<AlertDialog.Root bind:open={isDeleteDialogOpen}>
							<AlertDialog.Trigger
								class={buttonVariants({ variant: 'ghost' })}
								onclick={() => openDeleteDialog(medicine)}
							>
								<Trash2 />
							</AlertDialog.Trigger>

							<AlertDialog.Content class="max-w-sm">
								<AlertDialog.Header>
									<AlertDialog.Title>Are you sure?</AlertDialog.Title>
									<AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel
										onclick={() => {
											isDeleteDialogOpen = false; // Close the dialog without deleting
										}}
									>
										Cancel
									</AlertDialog.Cancel>

									<AlertDialog.Action
										onclick={() => {
											if (selectedRow) {
												deleteRow(selectedRow);
											}
										}}
										disabled={isLoading}
									>
										{#if isLoading}
											<span
												class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
											></span>
										{:else}
											Delete
										{/if}
									</AlertDialog.Action>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Root>
                        <Button href={`/admin/inventory/edit?id=${medicine.id}`} variant="ghost">
                            <Pencil />
                        </Button>
					</Table.Cell>
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
