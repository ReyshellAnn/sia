<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'; // Import Firestore functions
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore references
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

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
		visibleToCustomers: boolean;
		id: string;
		name: string;
		category: string;
		description: string;
		price: number;
		stock: number;
		imageUrl?: string;
		brand: string;
		generic: string;
		form: string;
		dosage: string;
		prescriptionRequired: boolean;
		productCode: string;
		expirationDate: string;
	}

	// Declare reactive variables
	let isAuthorized = $state(false); // Track if the user is authorized
	let errorMessage = $state(''); // Handle errors
	let medicines = $state<Medicine[]>([]); // Store medicines data from Firestore
	let selectedRow: Medicine | null = null; // Track the selected row
	let isLoading = $state(false); // Loading state
	let isDeleteDialogOpen = $state(false); // Controls the alert dialog
	let expandedDescriptions = $state({});

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

			// First, delete the image from Cloudinary if it exists
			if (medicine.imageUrl) {
				const publicId = medicine.imageUrl.split('/').pop()?.split('.')[0]; // Extract public_id

				const response = await fetch('/api/delete-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ public_id: publicId })
				});

				const cloudinaryResult = await response.json();

				if (!response.ok) {
					throw new Error(cloudinaryResult.error || 'Failed to delete image from Cloudinary');
				}
			}

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
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	};

	const toggleVisibility = async (medicine: Medicine, checked: boolean) => {
    try {
        const medicineRef = doc(db, 'medicines', medicine.id);
        await updateDoc(medicineRef, { visibleToCustomers: checked });

        toast.success(`Visibility updated to ${checked ? "visible" : "hidden"}`);
    } catch (error) {
        console.error('Error updating visibility:', error);
        toast.error("Failed to update visibility.");
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
	<header
		class="mb-4 flex flex-col items-center justify-between rounded-lg bg-white p-4 shadow-md sm:flex-row"
	>
		<span class="text-2xl font-semibold text-gray-700">📋 Inventory List</span>

		<div class="flex flex-row space-x-2">
			<Input
				type="search"
				placeholder="Search Medicine"
				class="w-[200px] rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-[250px]"
			/>
			<Button
				href="/admin/inventory/add"
				class="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
			>
				<Plus class="h-4 w-4" />
				Add Medicine
			</Button>
		</div>
	</header>

	<div class="overflow-x-auto rounded-lg bg-white shadow-md">
		<Table.Root class="w-full border-collapse text-left">
			<Table.Header class="bg-gray-100 text-gray-700">
				<Table.Row>
					<Table.Head class="px-6 py-3 text-center">Brand</Table.Head>
					<Table.Head class="px-4 py-3">Generic Name</Table.Head>
					<Table.Head class="px-4 py-3">Dosage & Form</Table.Head>
					<Table.Head class="px-4 py-3">Expiration Date</Table.Head>
					<Table.Head class="px-4 py-3">Category</Table.Head>
					<Table.Head class="px-4 py-3">Prescription</Table.Head>
					<Table.Head class="px-4 py-3">Price</Table.Head>
					<Table.Head class="px-4 py-3">Stock</Table.Head>
					<Table.Head class="px-4 py-3 text-center">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each medicines as medicine (medicine.id)}
					<Table.Row class="border-b transition hover:bg-gray-50">
						<Table.Cell class="flex items-center gap-3 px-10 py-3">
							{#if medicine.imageUrl}
								<img
									src={medicine.imageUrl}
									alt={medicine.name}
									class="h-10 w-10 rounded-full border border-gray-300"
								/>
							{:else}
								<span class="text-gray-400">No Image</span>
							{/if}
							<div>
								<span class="font-medium">{medicine.brand}</span>
								<span class="text-xs font-normal text-gray-700">#{medicine.productCode}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="px-4 py-3">{medicine.generic}</Table.Cell>
						<Table.Cell class="px-4 py-3">{medicine.dosage} {medicine.form}</Table.Cell>
						<Table.Cell class="px-4 py-3">{medicine.expirationDate}</Table.Cell>
						<Table.Cell class="px-4 py-3">{medicine.category}</Table.Cell>
						<Table.Cell class="px-4 py-3">
							{medicine.prescriptionRequired ? 'Yes' : 'No'}
						</Table.Cell>
						<Table.Cell class="px-4 py-3 font-semibold text-green-600"
							>₱{medicine.price.toFixed(2)}</Table.Cell
						>
						<Table.Cell class="px-4 py-3">{medicine.stock}</Table.Cell>
						<Table.Cell class="flex justify-center gap-2 px-4 py-3">
							<AlertDialog.Root bind:open={isDeleteDialogOpen}>
								<AlertDialog.Trigger
									class="rounded-lg bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
									onclick={() => openDeleteDialog(medicine)}
								>
									<Trash2 class="h-4 w-4" />
								</AlertDialog.Trigger>

								<AlertDialog.Content class="max-w-sm rounded-lg bg-white p-6 shadow-lg">
									<AlertDialog.Header>
										<AlertDialog.Title class="text-lg font-semibold text-gray-800"
											>Are you sure?</AlertDialog.Title
										>
										<AlertDialog.Description class="text-sm text-gray-600">
											This action cannot be undone.
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer class="flex justify-end space-x-2">
										<AlertDialog.Cancel
											class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition hover:bg-gray-200"
											onclick={() => {
												isDeleteDialogOpen = false;
											}}
										>
											Cancel
										</AlertDialog.Cancel>
										<AlertDialog.Action
											class="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
											onclick={() => {
												if (selectedRow) {
													deleteRow(selectedRow);
												}
											}}
											disabled={isLoading}
										>
											{#if isLoading}
												<span
													class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
												></span>
											{:else}
												Delete
											{/if}
										</AlertDialog.Action>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
							<Button
								href={`/admin/inventory/edit?id=${medicine.id}`}
								variant="ghost"
								class="rounded-lg bg-gray-100 p-2 transition hover:bg-gray-200"
							>
								<Pencil class="h-4 w-4 text-gray-600" />
							</Button>
							<div class="flex items-center space-x-2">
								<Switch
									id="visible-mode-{medicine.id}"
									bind:checked={medicine.visibleToCustomers}
									onCheckedChange={(checked) => toggleVisibility(medicine, checked)}
								/>
								<Label for="visible-mode-{medicine.id}">Visibility</Label>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

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
