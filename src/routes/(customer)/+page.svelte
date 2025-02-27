<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Star } from 'lucide-svelte';

	let medicines: any[] = [];
	let filteredMedicines: any[] = [];
	let user = page.data.user;
	let loading: Record<string, boolean> = {};

	let searchQuery = "";
	let selectedCategory = "";

	let categories: string[] = [];

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
							category: docSnap.data().category || "Uncategorized", // Ensure category exists
						};

						// Fetch reviews for each medicine
						const reviewsSnapshot = await getDocs(collection(db, 'medicines', docSnap.id, 'reviews'));
						const reviews = reviewsSnapshot.docs.map((reviewDoc) => reviewDoc.data());

						// Calculate average rating and total reviews
						const totalReviews = reviews.length;
						const averageRating =
							totalReviews > 0
								? parseFloat((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
								: 0.0;

						return {
							...medicineData,
							averageRating,
							totalReviews
						};
					})
			);

			// Extract unique categories
			categories = [...new Set(medicines.map(med => med.category))];

			// Initialize filtered list
			filterMedicines();
		} catch (error) {
			console.error('Error fetching medicines:', error);
		}
	});

	// Function to filter medicines based on search & category
	const filterMedicines = () => {
		filteredMedicines = medicines.filter(med => {
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
			goto('/login');
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
<div class="flex gap-4 mb-4">
	<input
		type="text"
		placeholder="Search medicine..."
		bind:value={searchQuery}
		on:input={filterMedicines}
		class="border p-2 rounded-md w-full"
	/>

	<select bind:value={selectedCategory} on:change={filterMedicines} class="border p-2 rounded-md">
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
<div class="flex flex-wrap gap-4">
	{#each filteredMedicines as medicine}
		<Card.Root class="w-60 bg-white rounded-lg shadow-md overflow-hidden">
			<Card.Content
				class="mx-auto flex items-center justify-center p-2 hover:cursor-pointer hover:bg-primary-foreground transition duration-200"
				onclick={() => goToMedicine(medicine.id)}
			>
				<img src={medicine.image} alt="Medicine" class="h-32 w-full object-cover rounded-t-lg group-hover:opacity-80 transition duration-200 p-2"/>
			</Card.Content>
			
			<Card.Footer class="p-3 flex flex-col items-start space-y-2">
				<span class="text-sm font-normal"><span class="font-semibold uppercase ">{medicine.brand}</span> {medicine.generic} {medicine.dosage} {medicine.form}</span>
				<div class="flex items-center gap-1">
					{#each Array(5) as _, i}
							<Star
								size={16}
								class={i < Math.round(medicine.averageRating) ? 'text-yellow-400' : 'text-gray-300'}
							/>
					{/each}
					<span class="text-xs text-gray-500">({medicine.totalReviews})</span>
				</div>
				<span class="text-sm font-semibold text-gray-600">₱{medicine.price}</span>

				<Button
					class="w-full bg-green-600 hover:bg-green-700"
					onclick={() => addToCart(medicine)}
					disabled={loading[medicine.id]}
				>
					{#if loading[medicine.id]}
						Adding...
					{:else}
						Add To Cart
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/each}
</div>
