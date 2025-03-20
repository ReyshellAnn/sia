<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/authStore';

	import {
		collection,
		getDocs,
		query,
		where,
		doc,
		deleteDoc,
		updateDoc,
		writeBatch
	} from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';
	import { onAuthStateChanged, type User } from 'firebase/auth'; // To track user auth state

	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import Input from '$lib/components/ui/input/input.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	let cartItems: any[] = [];
	let pickupOption = 'now'; // Default selection
	let scheduledPickupTime = ''; // Empty by default
	let loading: {
		cart: boolean; 
		proceed: boolean;
		clearCart: boolean;
		removeItem: string | null;
	} = {
		cart: true,
		proceed: false,
		clearCart: false,
		removeItem: null
	};

	// Generate time slots from 8:00 AM to 8:00 PM
	const timeSlots: any[] = [];
	for (let hour = 8; hour <= 20; hour++) {
		let formattedHour = hour > 12 ? hour - 12 : hour;
		let suffix = hour >= 12 ? 'PM' : 'AM';
		timeSlots.push({
			label: `${formattedHour}:00 ${suffix}`,
			value: `${formattedHour}:00 ${suffix}`
		});
	}

	// Disable past times based on current time
	const getDisabledTimes = () => {
		const currentTime = new Date();
		const currentHour = currentTime.getHours();
		const currentMinutes = currentTime.getMinutes();
		const disabledTimes = [];

		// Loop through time slots and find which are in the past
		for (let i = 0; i < timeSlots.length; i++) {
			const timeSlot = timeSlots[i];
			const [hour, minutes] = timeSlot.value.split(':');
			let slotHour = parseInt(hour);
			const isPM = timeSlot.value.includes('PM');

			if (isPM && slotHour < 12) slotHour += 12; // Convert to 24-hour format for comparison

			// If the slot time is before the current time, disable it
			if (
				slotHour < currentHour ||
				(slotHour === currentHour && parseInt(minutes) <= currentMinutes)
			) {
				disabledTimes.push(timeSlot.value);
			}
		}
		return disabledTimes;
	};

	const disabledTimes = getDisabledTimes();

	// Ensure user is authenticated and fetch cart items after authentication
	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		loading.cart = true; // Start loading

		try {
			const q = query(collection(db, 'cart'), where('userId', '==', currentUser.uid));
			const querySnapshot = await getDocs(q);

			cartItems = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
				imageUrl: doc.data().imageUrl || '/placeholder.png'
			}));
			console.log('Cart items retrieved successfully:', cartItems);
		} catch (error) {
			console.error('Error fetching cart items:', error);
		}finally {
        loading.cart = false; // Stop loading after fetching
    }
	});

	// Handle item quantity update
	const updateQuantity = async (itemId: string, newQuantity: number) => {
		try {
			const itemRef = doc(db, 'cart', itemId);
			await updateDoc(itemRef, { quantity: newQuantity });
			console.log('Quantity updated');

			// Update the cartItems locally
			cartItems = cartItems.map((item) =>
				item.id === itemId ? { ...item, quantity: newQuantity } : item
			);
		} catch (error) {
			console.error('Error updating quantity:', error);
		}
	};

	// Handle removing item from cart
	const removeFromCart = async (itemId: string) => {
		loading.removeItem = itemId; // Show loading state for this item
		try {
			const itemRef = doc(db, 'cart', itemId);
			await deleteDoc(itemRef);
			cartItems = cartItems.filter((item) => item.id !== itemId); // Remove from local state
			toast.success('Item removed from cart');
			console.log('Item removed from cart');
		} catch (error) {
			console.error('Error removing item from cart:', error);
			toast.error('Failed to remove item from cart');
		} finally {
			loading.removeItem = null; // Reset loading state for the item
		}
	};

	// Function to clear the cart
	const clearCart = async () => {
		loading.clearCart = true; // Show loading state for clear cart action
		try {
			const batch = writeBatch(db);
			for (const item of cartItems) {
				const itemRef = doc(db, 'cart', item.id);
				batch.delete(itemRef);
			}
			await batch.commit();
			cartItems = []; // Clear local state
			toast.success('Cart has been cleared');
			console.log('Cart has been cleared');
		} catch (error) {
			console.error('Error clearing cart:', error);
			toast.error('Failed to clear cart');
		} finally {
			loading.clearCart = false; // Reset loading state
		}
	};

	const proceedToPickup = async () => {
		loading.proceed = true; // Show loading state for proceed to pickup
		try {
			const currentUser = get(user); // ✅ Get the user from the store
			if (!currentUser || !currentUser.uid) {
				throw new Error('User is not logged in or UID is missing.');
			}

			// Generate a unique pickup ID
			const pickupId = `pickup_${Date.now()}`;

			// Consolidate all cart items
			const pickupData = {
				id: pickupId,
				userId: currentUser.uid,
				createdAt: new Date().toISOString(),
				pickupTime: pickupOption === 'now' ? 'ASAP' : scheduledPickupTime,
				items: cartItems.map((item) => ({
					medicineId: item.medicineId,
					name: item.name,
					quantity: item.quantity,
					price: item.price,
					imageUrl: item.imageUrl
				}))
			};

			const batch = writeBatch(db);

			// Create a single pickup document
			const pickupRef = doc(db, 'pickup', pickupId);
			batch.set(pickupRef, pickupData);

			// Remove all cart items
			for (const item of cartItems) {
				const cartRef = doc(db, 'cart', item.id);
				batch.delete(cartRef);
			}

			await batch.commit();

			toast.success('Proceeding to pickup');
			console.log('Pickup request created:', pickupData);
			goto('/pending-pickup');
		} catch (error) {
			console.error('Error proceeding to pickup:', error);
			toast.error('Failed to proceed to pickup');
		} finally {
			loading.proceed = false; // Reset loading state
		}
	};
</script>

<div class="flex flex-wrap gap-6">
	<div class="flex flex-[2] flex-col">
		<Card.Root class="w-full rounded-lg border-none bg-primary-foreground p-4 shadow-none">
			<span class="p-4 text-center text-lg font-medium text-gray-700"> 🛒 Your Cart </span>
			<Card.Content class="p-0 md:p-7">
				{#if cartItems.length === 0 && !loading.cart}
					<p class="text-center text-lg text-gray-500">
						Your cart is empty. Start adding items to your cart!
					</p>
				{:else if loading.cart}
				<div class="flex flex-wrap gap-6">
					<!-- Cart Items Skeleton -->
					<div class="flex flex-[2] flex-col">
					  <div class="w-full rounded-lg border-none  p-4">
						{#each Array(3) as _} <!-- Show 3 skeleton items -->
						  <div class="flex flex-row items-center justify-between border-b border-gray-200 py-4">
							<div class="flex w-2/5 flex-col items-center space-x-4 lg:flex-row">
							  <Skeleton class="w-20 h-20 rounded-md" />
							  <Skeleton class="h-4 w-[120px]" />
							</div>
				  
							<div class="flex w-1/4 flex-col items-center">
							  <Skeleton class="h-4 w-[60px]" />
							  <Skeleton class="h-5 w-[40px]" />
							</div>
				  
							<div class="flex w-1/4 flex-col items-center">
							  <Skeleton class="h-4 w-[60px]" />
							  <Skeleton class="h-8 w-16 rounded-sm" />
							</div>
				  
							<div class="flex flex-col items-center">
							  <Skeleton class="h-8 w-8 rounded-full" />
							</div>
						  </div>
						{/each}
					  </div>
					</div>
				  </div>
				  {:else}
					{#each cartItems as item}
						<div class="flex flex-row items-center justify-between border-b border-gray-300 py-4">
							<div class="flex w-2/5 flex-col items-center space-x-4 lg:flex-row">
								<img src={item.imageUrl} alt="Medicine" class="w-20 rounded-md object-cover" />
								<span class="text-xs md:text-sm">{item.name}</span>
							</div>

							<div class="flex w-1/2 flex-col items-center">
								<span class="text-sm text-gray-600">Price</span>
								<span class="text-sm font-semibold text-gray-600">₱{item.price}</span>
							</div>

							<div class="flex w-full md:w-1/4 flex-col items-center">
								<span class="text-sm text-gray-600">Quantity</span>
								<Input
									type="number"
									value={item.quantity}
									min="1"
									oninput={(e) => {
										const target = e.target as HTMLInputElement; // Type assertion to ensure it's an HTMLInputElement
										if (target) {
											updateQuantity(item.id, +target.value); // Safely access the value
										}
									}}
									class="w-10 md:w-24 rounded-sm border p-2 text-center"
								/>
							</div>

							<div class="flex flex-col items-center">
								<span class="text-sm text-gray-600"></span>
								<Button
									variant="ghost"
									class="rounded-full text-red-600 hover:text-red-900"
									onclick={() => removeFromCart(item.id)}
									disabled={loading.removeItem === item.id}
								>
									{#if loading.removeItem === item.id}
										Removing...
									{:else}
										<Trash2 />
									{/if}
								</Button>
							</div>
						</div>

						<Separator />
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="flex-1 rounded-lg bg-white p-4 shadow-md">
		<Card.Content class="flex flex-col space-y-4">
			<span class="text-xl font-medium">🛒 Cart Total</span>
			<Separator class="border-t border-gray-300" />

			<div class="flex items-center justify-between">
				<span class="text-lg font-medium">Total:</span>
				<span class="text-lg font-semibold text-black">
					₱{cartItems.reduce((total, item) => total + item.price * item.quantity, 0)}
				</span>
			</div>
			<span class="font-medium text-gray-700">Select Pickup Option:</span>
			<select bind:value={pickupOption} class="w-full rounded border p-2">
				<option value="now">Pickup Now</option>
				<option value="later">Schedule Pickup</option>
			</select>

			{#if pickupOption === 'later'}
				<div>
					<span class="font-medium text-gray-700">Select Pickup Time:</span>
					<select bind:value={scheduledPickupTime} class="w-full rounded border p-2">
						{#each timeSlots as time}
							<option value={time.value} disabled={disabledTimes.includes(time.value)}>
								{time.label}
							</option>
						{/each}
					</select>
				</div>
			{/if}

			<Button
				onclick={proceedToPickup}
				disabled={(pickupOption === 'later' && !scheduledPickupTime) ||
					cartItems.length === 0 ||
					loading.proceed}
				class="rounded-md bg-orange-400 px-4 py-2 font-semibold text-white hover:bg-orange-300 disabled:bg-gray-400"
			>
				{#if loading.proceed}
					Proceeding...
				{:else}
					Proceed to Pickup
				{/if}
			</Button>
			<Button
				variant="secondary"
				onclick={() => goto('/')}
				class="w-full rounded-md bg-gray-200 px-4 py-2 text-black hover:bg-gray-300"
			>
				<ArrowLeft />Return to Shopping
			</Button>
			<Button
				variant="secondary"
				disabled={cartItems.length === 0 || loading.clearCart}
				onclick={clearCart}
				class="w-full rounded-md bg-gray-200 px-4 py-2 text-black hover:bg-gray-300 disabled:bg-gray-400"
			>
				{#if loading.clearCart}
					Clearing...
				{:else}
					<Trash2 /> Clear Cart
				{/if}
			</Button>
		</Card.Content>
	</Card.Root>
</div>

<div class="flex flex-col space-y-4"></div>
