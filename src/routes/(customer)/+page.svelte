<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';

	import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';

	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Button } from '$lib/components/ui/button/index.js';

	import Star from 'lucide-svelte/icons/star';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';

	let medicines: any[] = [];
	let filteredMedicines: any[] = [];
	let user = page.data.user;
	let loading: Record<string, boolean> = {};

	let searchQuery = '';
	let selectedCategory = '';

	let categories: string[] = [];


	const showLoginDialog = writable(false);

	onMount(() => {
		onAuthStateChanged(auth, (currentUser) => {
			user = currentUser ? currentUser : null;
		});
	});

	onMount(async () => {
		try {
			const querySnapshot = await getDocs(collection(db, 'medicines'));
			medicines = await Promise.all(
				querySnapshot.docs
					.filter((docSnap) => docSnap.data().visibleToCustomers) // Only include visible medicines
					.map(async (docSnap) => {
						const medicineData = {
							id: docSnap.id,
							name: docSnap.data().name,
							price: docSnap.data().price,
							image: docSnap.data().imageUrl || '/placeholder.png',
							brand: docSnap.data().brand,
							generic: docSnap.data().generic,
							form: docSnap.data().form,
							dosage: docSnap.data().dosage,
							sold: docSnap.data().sold,
							category: docSnap.data().category || 'Uncategorized' // Ensure category exists
						};

						// Fetch reviews for each medicine
						const reviewsSnapshot = await getDocs(
							collection(db, 'medicines', docSnap.id, 'reviews')
						);
						const reviews = reviewsSnapshot.docs.map((reviewDoc) => reviewDoc.data());

						// Calculate average rating and total reviews
						const totalReviews = reviews.length;
						const averageRating =
							totalReviews > 0
								? parseFloat(
										(
											reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
										).toFixed(1)
									)
								: 0.0;

						return {
							...medicineData,
							averageRating,
							totalReviews
						};
					})
			);

			// Extract unique categories
			categories = [...new Set(medicines.map((med) => med.category))];

			// Initialize filtered list
			filterMedicines();
		} catch (error) {
			console.error('Error fetching medicines:', error);
		}
	});

	// Function to filter medicines based on search & category
	const filterMedicines = () => {
		filteredMedicines = medicines.filter((med) => {
			const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory ? med.category === selectedCategory : true;
			return matchesSearch && matchesCategory;
		});
	};

	const goToMedicine = (id: string) => {
		goto(`/medicine/${id}`);
	};

	const addToCart = async (medicine: any) => {
		if (!user) {
        showLoginDialog.set(true); // Show login dialog instead of redirecting
        return;
    	}


		loading = { ...loading, [medicine.id]: true }; // Mark button as loading

		try {
			// Fetch medicine stock
			const medicineRef = doc(db, 'medicines', medicine.id);
			const medicineSnapshot = await getDoc(medicineRef);

			if (!medicineSnapshot.exists()) {
				console.error('Medicine not found');
				return;
			}

			const stock = medicineSnapshot.data().stock || 0;

			if (stock === 0) {
				// If stock is 0, show a toast and return
				toast.error(`${medicine.name} is out of stock.`);
				return;
			}

			const userDocRef = doc(db, 'users', user.uid);
			const userDocSnap = await getDoc(userDocRef);

			if (!userDocSnap.exists()) {
				console.error('User document not found');
				return;
			}

			const fullName = userDocSnap.data().fullName;
			const querySnapshot = await getDocs(collection(db, 'cart'));
			const existingItem = querySnapshot.docs.find(
				(doc) => doc.data().medicineId === medicine.id && doc.data().userId === user.uid
			);

			if (existingItem) {
				await updateDoc(doc(db, 'cart', existingItem.id), {
					quantity: existingItem.data().quantity + 1
				});
			} else {
				await addDoc(collection(db, 'cart'), {
					userId: user.uid,
					fullName: fullName,
					medicineId: medicine.id,
					name: medicine.name,
					price: medicine.price,
					quantity: 1,
					imageUrl: medicine.image || '/placeholder.png',
					createdAt: new Date().toISOString()
				});
			}

			toast.success(`${medicine.name} added to cart!`);
		} catch (error) {
			console.error('Error adding to cart:', error);
			toast.error('Failed to add item to cart.');
		} finally {
			loading = { ...loading, [medicine.id]: false }; // Reset loading state
		}
	};
</script>

<!-- Search and Filter UI -->
<div class="mb-4 flex justify-between gap-4">
	<input
		type="text"
		placeholder="Search medicine..."
		bind:value={searchQuery}
		on:input={filterMedicines}
		class="w-full max-w-xs rounded-md border p-2"
	/>

	<select bind:value={selectedCategory} on:change={filterMedicines} class="rounded-md border p-2">
		<option value="">All Categories</option>
		<option value="Allergy & Antihistamines">Allergy & Antihistamines</option>
		<option value="Antibiotics">Antibiotics</option>
		<option value="Baby & Infant Care">Baby & Infant Care</option>
		<option value="Cough, Cold & Flu">Cough, Cold & Flu</option>
		<option value="Diabetes Care">Diabetes Care</option>
		<option value="Digestive Health">Digestive Health</option>
		<option value="First Aid & Wound Care">First Aid & Wound Care</option>
		<option value="Heart Health">Heart Health</option>
		<option value="Women's Health">Women's Health</option>
	</select>
</div>

<!-- Medicine Cards -->
<div class="flex flex-wrap">
	{#each filteredMedicines as medicine}
		<Card.Root class="flex w-60 flex-col overflow-hidden rounded-none border-none bg-white">
			<Card.Content
				class="mx-auto flex items-center justify-center p-2 transition duration-200 hover:cursor-pointer"
				onclick={() => goToMedicine(medicine.id)}
			>
				<img
					src={medicine.image}
					alt="Medicine"
					class="h-52 w-full rounded-t-lg object-cover p-2 transition duration-200 group-hover:opacity-80"
				/>
			</Card.Content>

			<div class="flex flex-grow flex-col space-y-4 p-3">
				<!-- Fixed height for the medicine name -->
				<div class="min-h-[60px]">
					<span class="text-sm font-normal">
						<span class="font-semibold uppercase">{medicine.brand}</span>
						{medicine.generic}
						{medicine.dosage}
						{medicine.form}
					</span>
				</div>

				<div class="flex items-center gap-1">
					{#each Array(5) as _, i}
						<Star
							size={16}
							class={i < Math.round(medicine.averageRating) ? 'text-yellow-400' : 'text-gray-300'}
						/>
					{/each}
					<span class="text-xs text-gray-500">({medicine.totalReviews})</span>
				</div>

				<!-- Fixed height for price & sold count -->
				<div class="flex min-h-[30px] flex-col justify-center">
					<span class="text-lg font-medium text-gray-600"
						><span class="font-normal">₱</span>{medicine.price % 1 === 0
							? `${medicine.price}.00`
							: medicine.price}</span
					>
					<div class="flex flex-row justify-between">
						<span class="text-sm font-sm text-gray-500">
							{medicine.sold > 0 ? `${medicine.sold} Sold` : ''}
						  </span>
						  

						<Button
							class=" h-8 bg-green-600 hover:bg-green-700"
							onclick={() => addToCart(medicine)}
							disabled={loading[medicine.id]}
						>
							{#if loading[medicine.id]}
								<span
									class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
								></span>
							{:else}
								<ShoppingCart />
							{/if}
						</Button>
					</div>
				</div>
			</div>
		</Card.Root>
	{/each}
</div>

{#if $showLoginDialog}
<Dialog.Root bind:open={$showLoginDialog}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>Login Required</Dialog.Title>
			<Dialog.Description>You need to be logged in to add to cart.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-4">
			<Button variant="outline" onclick={() => showLoginDialog.set(false)}>Cancel</Button>
			<Button onclick={() => goto('/login')}>Login</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
{/if}
