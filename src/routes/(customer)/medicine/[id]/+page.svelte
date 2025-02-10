<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import { toast } from 'svelte-sonner';

	let medicine: any = null;
	let quantity = 1;
	let medicines: any[] = [];
	let currentId: string;
	let user = page.data.user;
	let loading: Record<string, boolean> = {};

	let ratings = [
		{ stars: 5, count: 30 },
		{ stars: 4, count: 0 },
		{ stars: 3, count: 1 },
		{ stars: 2, count: 0 },
		{ stars: 1, count: 1 }
	];

	const fetchMedicine = async () => {
		currentId = page.params.id;

		if (!currentId) {
			console.error('No medicine id found in the URL');
			return;
		}

		try {
			const docRef = doc(db, 'medicines', currentId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				medicine = { ...docSnap.data(), id: docSnap.id }; // Add id here
			} else {
				console.log('No such document!');
			}

			const querySnapshot = await getDocs(collection(db, 'medicines'));
			medicines = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				name: doc.data().name,
				price: doc.data().price,
				imageUrl: doc.data().imageUrl || '/placeholder.png'
			}));
		} catch (error) {
			console.error('Error fetching medicine details:', error);
		}
	};

	afterUpdate(() => {
		if (page.params.id !== currentId) {
			fetchMedicine();
		}
	});

	onMount(() => {
		fetchMedicine();
		onAuthStateChanged(auth, (currentUser) => {
			user = currentUser ? currentUser : null;
		});
	});

	const goToMedicine = (id: string) => {
		goto(`/medicine/${id}`);
	};

	const addToCart = async (medicine: any, quantity: number) => {
		if (!user) {
			goto('/login');
			return;
		}

		// Check if required fields are present
		if (!medicine || !medicine.id || !medicine.name || !medicine.price || !medicine.imageUrl) {
			console.error('Invalid medicine data:', medicine);
			toast.error('Failed to add item to cart. Invalid medicine data.');
			return;
		}

		loading = { ...loading, [medicine.id]: true }; // Show loading state

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
				// If stock is 0 or not enough stock, show a toast and return
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
					quantity: existingItem.data().quantity + quantity // Add the correct quantity
				});
			} else {
				await addDoc(collection(db, 'cart'), {
					userId: user.uid,
					fullName: fullName,
					medicineId: medicine.id,
					name: medicine.name,
					price: medicine.price,
					quantity: quantity, // Add the specified quantity
					imageUrl: medicine.imageUrl || '/placeholder.png',
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

{#if medicine}
	<div class="flex flex-row">
		<Card.Root class="flex-1 border-none shadow-none">
			<Card.Content class="mx-auto flex flex-col items-center justify-center p-0">
				<img src={medicine.imageUrl || '/placeholder.png'} alt={medicine.name} class="w-86" />

				<div class="w-full space-y-4 rounded-lg p-4">
					<h2 class="text-xl font-medium">REVIEW</h2>
					<div class="mb-6 flex flex-row justify-between">
						<div class="flex flex-col space-x-2">
							<span class="text-6xl font-light">4.8</span>
							<div class="flex">
								{#each Array(5) as _, i}
									<span class={i === 4 ? 'text-gray-400' : 'text-yellow-400'}>★</span>
								{/each}
							</div>
						</div>

						<div class="mt-2">
							{#each ratings as rating}
								<div class="flex items-center">
									<span class="text-sm font-medium">{rating.stars} ★</span>
									<div class="ml-2 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
										<div class="h-full bg-black" style="width: {(rating.count / 31) * 100}%"></div>
									</div>
									<span class="ml-2 text-sm">{rating.count}</span>
								</div>
							{/each}
						</div>
					</div>
					<Separator />
					<div class="flex flex-row justify-between">
						<p class="mt-4 text-lg font-semibold">
							31 <span class="text-sm font-light">Reviews</span>
						</p>
						<Button class=" rounded-md bg-black text-white">WRITE A REVIEW</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="flex-1 border-none shadow-none">
			<Card.Content class="mx-auto flex flex-col items-start justify-start space-y-2 p-2">
				<span class="text-2xl font-medium">{medicine.name}</span>
				<!-- Star Rating -->
				<div class="flex items-center gap-1">
					{#each Array(5) as _, i}
						<span class={i < medicine.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
					{/each}
					<span class="text-sm text-gray-500">({medicine.ratingCount})</span>
				</div>
				<span class="text-xl font-medium">₱{medicine.price}</span>
				<span class="text-sm font-normal">Stock: {medicine.stock}</span>
				<Separator />
				<span class="text-base font-medium">Quantity</span>
				<div class="flex w-full flex-row gap-2">
					<Input
						type="number"
						bind:value={quantity}
						class="w-24"
						min="1"
						max={medicine?.stock || 0}
						disabled={medicine?.stock === 0}
						oninput={() => {
							if (quantity > (medicine?.stock || 0)) {
								quantity = medicine?.stock || 0; // Ensure quantity doesn't exceed stock
							}
						}}
					/>

					<Button
						class="flex-1"
						onclick={() => addToCart(medicine, quantity)}
						disabled={loading[medicine.id]}
					>
						{#if loading[medicine.id]}
							Adding...
						{:else}
							Add To Cart
						{/if}
					</Button>
				</div>
				<span class="text-lg font-medium">About the Product</span>
				<span>{medicine.description || 'No description available'}</span>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Content><Card.Title>You may also like</Card.Title></Card.Content>
	</Card.Root>
	<div class="flex w-full items-center justify-center">
		<Carousel.Root class="w-full max-w-6xl">
			<Carousel.Content class="-ml-1">
				{#each medicines.filter((m) => m.id !== currentId) as medicine, i (i)}
					<Carousel.Item
						class="pl-1 md:basis-1/3 lg:basis-1/4"
						onclick={() => goToMedicine(medicine.id)}
					>
						<div class="p-1">
							<Card.Root>
								<Card.Content
									class="flex aspect-square items-center justify-center p-6 hover:cursor-pointer hover:bg-primary-foreground"
								>
									<!-- Ensure a uniform size for images with object-fit -->
									<img src={medicine.imageUrl} alt="Medicine" class="h-64 w-64 object-cover" />
								</Card.Content>
								<Card.Footer class="flex flex-col items-start space-y-3 p-2">
									<span class="text-lg font-normal">{medicine.name}</span>
									<span class="text-lg font-medium">₱{medicine.price}</span>
									<Button
										class="w-full"
										onclick={(e) => {
											e.stopPropagation(); // Prevent the Carousel.Item click event from triggering
											addToCart(medicine, 1); // Default quantity of 1
										}}
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
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
			<Carousel.Previous />
			<Carousel.Next />
		</Carousel.Root>
	</div>
{/if}
