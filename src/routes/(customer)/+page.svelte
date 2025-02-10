<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import { toast } from 'svelte-sonner';

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
			medicines = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				name: doc.data().name,
				price: doc.data().price,
				image: doc.data().imageUrl || '/placeholder.png'
			}));
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
		<Card.Root class="w-72">
			<Card.Content
				class="mx-auto flex items-center justify-center p-0 hover:cursor-pointer hover:bg-primary-foreground"
				onclick={() => goToMedicine(medicine.id)}
			>
				<img src={medicine.image} alt="Medicine" class="h-48 w-full rounded-md object-cover" />
			</Card.Content>
			<Card.Footer class="flex flex-col items-start space-y-3 p-2">
				<span class="text-lg font-normal">{medicine.name}</span>
				<span class="text-lg font-medium">₱{medicine.price}</span>

				<!-- Star Rating -->
				<div class="flex items-center gap-1">
					{#each Array(5) as _, i}
						<span class={i < medicine.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
					{/each}
					<span class="text-sm text-gray-500">({medicine.ratingCount})</span>
				</div>

				<Button
					class="w-full bg-orange-400 hover:bg-orange-500"
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
