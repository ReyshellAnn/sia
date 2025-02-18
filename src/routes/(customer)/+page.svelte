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
	let user = page.data.user;
	let loading: Record<string, boolean> = {};

	onMount(() => {
		onAuthStateChanged(auth, (currentUser) => {
			user = currentUser ? currentUser : null;
		});
	});

	onMount(async () => {
	try {
		const querySnapshot = await getDocs(collection(db, 'medicines'));
		medicines = await Promise.all(
			querySnapshot.docs.map(async (docSnap) => {
				const medicineData = {
					id: docSnap.id,
					name: docSnap.data().name,
					price: docSnap.data().price,
					image: docSnap.data().imageUrl || '/placeholder.png'
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
	} catch (error) {
		console.error('Error fetching medicines:', error);
	}
});


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

<div class="flex flex-wrap gap-4">
	{#each medicines as medicine}
		<Card.Root class="w-60 bg-white rounded-lg shadow-md overflow-hidden">
			<Card.Content
				class="mx-auto flex items-center justify-center p-2 hover:cursor-pointer hover:bg-primary-foreground transition duration-200"
				onclick={() => goToMedicine(medicine.id)}
			>
				<img src={medicine.image} alt="Medicine" class="h-32 w-full object-cover rounded-t-lg group-hover:opacity-80 transition duration-200 p-2"/>
			</Card.Content>
			
			<Card.Footer class="p-3 flex flex-col items-start space-y-2">
				<span class="text-sm font-normal">{medicine.name}</span>
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
