<script lang="ts">
	import { onMount } from 'svelte';
	import { categoriesStore } from '$lib/stores/categories'; // Import the shared store
	import { toast } from 'svelte-sonner';

	import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'; // Import Firestore functions
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore references
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	
	import ManageCategories from '../ManageCategories.svelte';

	import Check from 'lucide-svelte/icons/check';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

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
	let value = $state('');
	let name = $state('');
	let description = $state('');
	let price = $state(0);
	let stock = $state(0);
	let imageUrl = $state('');
	let isAuthorized = $state(false); // Track if the user is authorized
	let errorMessage = $state(''); // Handle errors
	let medicines = $state<Medicine[]>([]); // Store medicines data from Firestore
	let selectedFile = $state<File | null>(null);

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

	let categories = $state<Array<{ value: string; label: string }>>([]);
	categoriesStore.subscribe((value) => {
		categories = value;
	});

	let isLoading = $state(false); // Loading state

	// Handle form submission
	const handleSubmit = async () => {
		if (!name || !description || !price || !stock || !value || !imageUrl) {
			toast.error('Please fill in all fields, including image.');
			return;
		}

		const newMedicine = {
			name,
			category: categories.find((cat) => cat.value === value)?.label || '',
			description,
			price,
			stock,
			imageUrl // Include uploaded image URL
		};

		try {
			isLoading = true;
			const newDocRef = doc(collection(db, 'medicines'));
			await setDoc(newDocRef, newMedicine);
			toast.success('Medicine added successfully!');
		} catch (error) {
			console.error('Error adding medicine:', error);
			toast.error('Error adding medicine.');
		} finally {
			isLoading = false;
		}
	};

	/// Handle file selection
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
		}
	}

	// Upload image to Cloudinary
	async function uploadImage() {
		if (!selectedFile) return alert('Please select an image.');

		const formData = new FormData();
		formData.append('file', selectedFile);
		formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET); // ml_default or your preset

		const response = await fetch(
			`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`,
			{
				method: 'POST',
				body: formData
			}
		);

		const data = await response.json();
		imageUrl = data.secure_url;
	}

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
</script>

<!-- Render content only if the user is authorized -->
{#if isAuthorized}
	<header class="flex flex-row justify-between px-20">
		<div>
			<Button href="/admin/inventory" variant="ghost" class="rounded-full">
				<ArrowLeft />
			</Button>
			<span class="text-2xl font-semibold">Add Medicine</span>
		</div>

		<div class="flex flex-row space-x-2">
			<Button onclick={handleSubmit} disabled={isLoading}>
				{#if isLoading}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
					></span>
				{:else}
					<Check />Submit
				{/if}
			</Button>
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
						<Input type="text" bind:value={name} />
					</div>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Description</span>
						<Textarea class="min-h-40" bind:value={description} />
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
								<Input type="number" bind:value={price} />
							</div>
							<div class="flex-1">
								<span class="text-sm font-medium text-muted-foreground">Stock</span>
								<Input type="number" bind:value={stock} />
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
		<!-- Right Div -->
		<div class="flex flex-[1] flex-col space-y-6">
			<!-- Upload Image Section -->
			<Card.Root class="bg-primary-foreground">
				<Card.Content class="space-y-3">
					<span class="text-lg font-medium">Upload Image</span>
					<div class="flex flex-col items-center border">
						{#if imageUrl}
							<img src={imageUrl} alt="" class="w-40" />
						{:else}
							<img src="/placeholder.png" alt="Placeholder" class="w-40" />
						{/if}
					</div>
				</Card.Content>
				<Card.Footer>
					<Input id="picture" type="file" accept="image/*" onchange={handleFileChange} />
					<Button onclick={uploadImage}>Upload</Button>
				</Card.Footer>
			</Card.Root>
			<Card.Root class="flex-1 bg-primary-foreground">
				<Card.Content class="space-y-3 py-3">
					<span class="text-lg font-medium">Category</span>
					<Select.Root type="single" name="medicineCategory" bind:value>
						<Select.Trigger class="w-full">
							{value ? categories.find((cat) => cat.value === value)?.label : 'Select a category'}
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
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message if any -->
{/if}
