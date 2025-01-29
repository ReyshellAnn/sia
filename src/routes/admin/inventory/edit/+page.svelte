<script lang="ts">
	import Check from 'lucide-svelte/icons/check';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	import { onMount } from 'svelte';
	import { categoriesStore } from '$lib/stores/categories'; // Import the shared store
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';

	import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'; // Import Firestore functions
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore references
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import ManageCategories from '../ManageCategories.svelte';

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

	let medicine = $state<Medicine>({
		id: '',
		name: '',
		category: '',
		description: '',
		price: 0,
		stock: 0
	});

    let value = $state('');
	let isAuthorized = $state(false); // Track if the user is authorized
	let errorMessage = $state(''); // Handle errors
	let isLoading = $state(true);

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

	let categories = $state<Array<{ value: string; label: string }>>([]);
	categoriesStore.subscribe((value) => {
		categories = value;
	});

    const handleSubmit = async () => {
	if (
		!medicine.name ||
		!medicine.description ||
		!medicine.price ||
		!medicine.stock ||
		!medicine.category
	) {
		toast.error('Please fill in all the fields.');
		errorMessage = 'Please fill in all the fields.';
		return;
	}
	try {
		// Get the selected category object based on the value
		const selectedCategory = categories.find((cat) => cat.value === medicine.category);
		const categoryLabel = selectedCategory ? selectedCategory.label : '';

		// Update the medicine object with the category label
		medicine.category = categoryLabel;

		// Exclude the 'id' field from the update payload
		const { id, ...medicineData } = medicine;

		// Update the medicine document in Firestore
		const medicineRef = doc(db, 'medicines', id);
		await updateDoc(medicineRef, { ...medicineData });

		toast.success('Medicine updated successfully!');
	} catch (error) {
		console.error('Error updating medicine:', error);
		toast.error('Error updating medicine.');
	}
};

	// Fetch categories from Firestore on mount
	onMount(async () => {
		try {
			const querySnapshot = await getDocs(collection(db, 'categories'));
			const fetchedCategories = querySnapshot.docs.map((doc) => ({
				value: doc.id,
				label: doc.data().label
			}));
			// Update the store with the fetched categories
			categoriesStore.set(fetchedCategories);
		} catch (error) {
			console.error('Error fetching categories:', error);
		}
	});

	// Fetch the medicine data by id
	onMount(async () => {
		const id = page.url.searchParams.get('id');

		if (!id) {
			errorMessage = 'Medicine ID is missing.';
			isLoading = false;
			return;
		}

		try {
			const medicineRef = doc(db, 'medicines', id);
			const docSnap = await getDoc(medicineRef);

			if (docSnap.exists()) {
				medicine = { id: docSnap.id, ...docSnap.data() } as Medicine;
			} else {
				errorMessage = 'Medicine not found.';
			}
		} catch (error) {
			errorMessage = 'An error occurred while fetching the medicine.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	});
</script>

<!-- Render content only if the user is authorized -->
{#if isAuthorized}
	{#if !isLoading}
		<header class="flex flex-row justify-between px-20">
			<div>
				<Button href="/admin/inventory" variant="ghost" class="rounded-full">
					<ArrowLeft />
				</Button>
				<span class="text-2xl font-semibold">Edit Medicine</span>
			</div>

			<div class="flex flex-row space-x-2">
				<Button onclick={handleSubmit}><Check />Save Changes</Button>
			</div>
		</header>
		<div class="flex flex-row space-x-8 px-20">
			<!-- Left Div -->
			<div class="flex flex-[2] flex-col space-y-6">
				<Card.Root class="bg-primary-foreground">
					<Card.Content class="space-y-3 py-3 pb-6">
						<span class="text-lg font-medium">General Information</span>
						<div>
							<span class="text-sm font-medium text-muted-foreground">Name of Medicine</span>
							<Input type="text" bind:value={medicine.name} />
						</div>
						<div>
							<span class="text-sm font-medium text-muted-foreground">Description</span>
							<Textarea class="min-h-40" bind:value={medicine.description} />
						</div>
					</Card.Content>
				</Card.Root>
				<div class="flex flex-row space-x-4">
					<Card.Root class="flex-1 bg-primary-foreground">
						<Card.Content class="space-y-3 py-3 pb-6">
							<span class="text-lg font-medium">Pricing And Stock</span>
							<div class="flex flex-row space-x-4">
								<div class="flex-1">
									<span class="text-sm font-medium text-muted-foreground">Price</span>
									<Input type="number" bind:value={medicine.price} />
								</div>
								<div class="flex-1">
									<span class="text-sm font-medium text-muted-foreground">Stock</span>
									<Input type="number" bind:value={medicine.stock} />
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
			<!-- Right Div -->
			<div class="flex flex-[1] flex-col space-y-6">
				<Card.Root class="bg-primary-foreground">
					<Card.Content class="space-y-3">
						<span class="text-lg font-medium">Upload Image</span>
						<div class="flex flex-col items-center border">
							<img src="/placeholder.png" alt="Placeholder" class="w-40" />
						</div>
					</Card.Content>
					<Card.Footer>
						<Input id="picture" type="file" />
					</Card.Footer>
				</Card.Root>
				<Card.Root class="flex-1 bg-primary-foreground">
					<Card.Content class="space-y-3 py-3">
						<span class="text-lg font-medium">Category</span>
						<Select.Root type="single" name="medicineCategory" bind:value={medicine.category}>
							<Select.Trigger class="w-full">
                                {medicine.category
                                    ? categories.find((cat) => cat.value === medicine.category)?.label
                                    : 'Select a category'}
							</Select.Trigger>

							<Select.Content>
								<Select.Group>
									{#each categories as category}
										<Select.Item value={category.value} label={category.label}
											>{category.label}</Select.Item
										>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>

						<Dialog.Root>
							<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
								>Manage Categories</Dialog.Trigger
							>
							<Dialog.Content class="sm:max-w-[425px]">
								<Dialog.Header>
									<Dialog.Title>Manage Category</Dialog.Title>
									<Dialog.Description>Add, edit, or delete categories here.</Dialog.Description>
								</Dialog.Header>
								<ManageCategories />
							</Dialog.Content>
						</Dialog.Root>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{:else}
		<!-- Loading Spinner -->
		<div>Loading...</div>
	{/if}
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message if any -->
{/if}
