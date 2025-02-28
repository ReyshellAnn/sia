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
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

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
		dosage: string;
		form: string;
		brand: string;
		generic: string;
		expirationDate: string;
		prescriptionRequired: boolean;
		productCode: string;
		visibleToCustomers: boolean;
	}

	// Declare reactive variables
	let value = $state('');
	let name = $state('');
	let description = $state('');
	let price = $state(0);
	let stock = $state(0);
	let brand = $state('');
	let generic = $state('');
	let dosage = $state('');
	let dosageValue = $state(0);
	let expirationDate = $state('');
	let prescriptionRequired = $state(false);
	let visibleToCustomers = $state(false);
	let productCode = $state('');
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
    if (
        !name ||
        !description ||
        !price ||
        !stock ||
        !value ||
        !selectedFile || // Ensure a file is selected instead of checking imageUrl
        !dosageValue ||
        !form ||
        !brand ||
        !generic ||
        !expirationDate
    ) {
        toast.error("Please fill in all fields, including image.");
        return;
    }


		isLoading = true;
		try {
			// Fetch the highest productCode from Firestore
			const querySnapshot = await getDocs(collection(db, 'medicines'));
			let maxProductCode = 10000000; // Default start value

			querySnapshot.forEach((doc) => {
				const data = doc.data();
				if (data.productCode) {
					const code = parseInt(data.productCode, 10);
					if (!isNaN(code) && code > maxProductCode) {
						maxProductCode = code;
					}
				}
			});

			// Generate new productCode
			productCode = (maxProductCode + 1).toString();

			// Upload image before saving medicine data
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

			const response = await fetch(
				`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`,
				{
					method: 'POST',
					body: formData
				}
			);

			const data = await response.json();
			imageUrl = data.secure_url; // Assign the uploaded image URL

			const newMedicine = {
				name,
				category: categories.find((cat) => cat.value === value)?.label || '',
				description,
				price,
				stock,
				imageUrl, // Now the uploaded image URL is included
				brand,
				generic,
				dosage: `${dosageValue} ${dosageUnit}`,
				form,
				expirationDate,
				prescriptionRequired,
				productCode,
				visibleToCustomers
			};

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

	let input;
	let imageUrl = $state('');
	let showImage = $state(false);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			selectedFile = input.files[0]; // Update selectedFile
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					imageUrl = reader.result;
					showImage = true;
				}
			};
			reader.readAsDataURL(selectedFile);
		} else {
			showImage = false;
			imageUrl = '';
		}
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

	// Define the dosage units
	const units = [
		{ value: 'mg', label: 'mg' },
		{ value: 'mcg', label: 'mcg' },
		{ value: 'mL', label: 'mL' },
		{ value: 'IU', label: 'IU' },
		{ value: 'g', label: 'g' }
	];

	let dosageUnit = $state('mg');

	const forms = [
		{ value: 'Oral Tablet', label: 'Oral Tablet' },
		{ value: 'Capsule', label: 'Capsule' },
		{ value: 'Liquid', label: 'Liquid' },
		{ value: 'Injection', label: 'Injection' },
		{ value: 'Powder', label: 'Powder' }
	];

	let form = $state('oral tablet');
</script>

{#if isAuthorized}
	<header
		class="mx-auto flex w-full items-center justify-between rounded-lg bg-white px-6 py-3 shadow-sm"
	>
		<div class="flex items-center space-x-3">
			<Button href="/admin/inventory" variant="ghost" class="rounded-full">
				<ArrowLeft />
			</Button>
			<span class="text-2xl font-semibold">💊 Add Medicine</span>
		</div>

		<Button
			onclick={handleSubmit}
			disabled={isLoading}
			class="rounded-lg bg-green-600 px-5 py-2 text-white transition hover:bg-green-700"
		>
			{#if isLoading}
				<span
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
				></span>
			{:else}
				<Check /> Submit
			{/if}
		</Button>
	</header>

	<div class="grid grid-cols-3 gap-8 px-20 py-6">
		<!-- Left Column (General Information & Pricing) -->
		<div class="col-span-2 space-y-6">
			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4 p-5">
					<span class="text-lg font-medium">General Information</span>
					<div>
						<label for="name" class="text-sm font-medium text-muted-foreground">Display Name</label>
						<Input type="text" id="name" bind:value={name} />
					</div>
					<div class="flex flex-row space-x-4">
						<div class="flex-1">
							<label for="brand-name" class="text-sm font-medium text-muted-foreground"
								>Brand Name</label
							>
							<Input type="text" id="brand-name" bind:value={brand} />
						</div>
						<div class="flex-1">
							<label for="generic-name" class="text-sm font-medium text-muted-foreground"
								>Generic Name</label
							>
							<Input type="text" id="generic-name" bind:value={generic} />
						</div>
					</div>

					<div>
						<label for="description" class="text-sm font-medium text-muted-foreground"
							>Description</label
						>
						<Textarea id="description" class="min-h-40" bind:value={description} />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4 p-5">
					<span class="text-lg font-medium">Dosage & Form</span>
					<div class="flex flex-row space-x-4">
						<div class="flex-1">
							<label for="dosage-value" class="text-sm font-medium text-muted-foreground"
								>Dosage</label
							>
							<div class="flex space-x-2">
								<Input
									type="number"
									id="dosage-value"
									bind:value={dosageValue}
									min="0"
									class="flex-1"
								/>
								<Select.Root type="single" name="dosageUnit" bind:value={dosageUnit}>
									<Select.Trigger class="w-[100px]">
										{units.find((unit) => unit.value === dosageUnit)?.label ?? 'Select a unit'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each units as unit}
												<Select.Item value={unit.value} label={unit.label}>{unit.label}</Select.Item
												>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
						</div>

						<div class="flex-1">
							<label for="form" class="text-sm font-medium text-muted-foreground">Form</label>
							<Select.Root type="single" name="form" bind:value={form}>
								<Select.Trigger class="flex h-10 w-full">
									{forms.find((f) => f.value === form)?.label ?? 'Select a form'}
								</Select.Trigger>
								<Select.Content>
									<Select.Group>
										{#each forms as f}
											<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4 p-5">
					<span class="text-lg font-medium">Pricing & Stock</span>
					<div class="flex flex-row space-x-4">
						<div class="flex-1">
							<label for="price" class="text-sm font-medium text-muted-foreground">Price</label>
							<Input type="number" id="price" bind:value={price} />
						</div>
						<div class="flex-1">
							<label for="stock" class="text-sm font-medium text-muted-foreground">Stock</label>
							<Input type="number" id="stock" bind:value={stock} />
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right Column (Image Upload & Category) -->
		<div class="space-y-6">
			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4 p-4">
					<span class="text-lg font-medium">Upload Image</span>
					<div
						class="flex flex-col items-center justify-center rounded-lg border border-gray-300 p-4"
					>
						{#if showImage}
							<img src={imageUrl} alt="Uploaded File" class="w-40" />
						{:else}
							<img
								src="/placeholder.png"
								alt="Placeholder"
								class="h-40 w-40 rounded-lg object-cover"
							/>
						{/if}
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between p-4">
						<Input
							id="picture"
							type="file"
							accept="image/*"
							onchange={handleFileChange}
						/>
				</Card.Footer>
			</Card.Root>

			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4 p-5">
					<span class="text-lg font-medium">Category</span>
					<Select.Root type="single" name="medicineCategory" bind:value>
						<Select.Trigger class="w-full rounded-lg border border-gray-300 p-2">
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
						<Dialog.Trigger
							class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
						>
							Manage Categories
						</Dialog.Trigger>
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
			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4">
					<span class="text-lg font-medium">Product Settings</span>
					<div class="flex flex-col space-y-4">
						<div class="flex items-center space-x-2">
							<Switch id="visible-mode" bind:checked={visibleToCustomers} />
							<Label
								for="visible-mode"
								class={`text-sm font-medium ${visibleToCustomers ? 'text-black' : 'text-muted-foreground'}`}
							>
								Visible to Customers
							</Label>
						</div>

						<div class="flex items-center space-x-2">
							<Switch id="prescription-required" bind:checked={prescriptionRequired} />
							<Label
								for="prescription-required"
								class={`text-sm font-medium ${prescriptionRequired ? 'text-black' : 'text-muted-foreground'}`}
							>
								Prescription Required
							</Label>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="rounded-lg bg-white shadow-md">
				<Card.Content class="space-y-4">
					<span class="text-lg font-medium">Expiration Date</span>
					<!-- Expiration Date Field -->
					<div class="max-w-40">
						<Input type="date" id="expiration-date" bind:value={expirationDate} />
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
{:else if errorMessage}
	<p class="mt-4 text-center text-red-600">{errorMessage}</p>
{/if}
