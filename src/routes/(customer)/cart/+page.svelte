<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

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
	import Input from '$lib/components/ui/input/input.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	let user: User;
	let cartItems: any[] = [];
	let pickupOption = 'now'; // Default selection
	let scheduledPickupTime = ''; // Empty by default
	let loading: {
		proceed: boolean;
		clearCart: boolean;
		removeItem: string | null;
	} = {
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
	onMount(() => {
		onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				// If no user is logged in, redirect to login page
				goto('/login');
				return;
			}

			// Set user state after authentication
			user = currentUser;

			// Fetch the user's cart items
			try {
				const q = query(collection(db, 'cart'), where('userId', '==', user.uid)); // Query the cart collection for this user
				const querySnapshot = await getDocs(q);

				cartItems = querySnapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
					imageUrl: doc.data().imageUrl || '/placeholder.png'
				}));
				console.log('Cart items retrieved successfully:', cartItems);
			} catch (error) {
				console.error('Error fetching cart items:', error);
			}
		});
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
			// Generate a unique pickup ID
			const pickupId = `pickup_${Date.now()}`;

			// Consolidate all cart items
			const pickupData = {
				id: pickupId,
				userId: user.uid,
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

<div class="flex flex-wrap gap-12">
	<div class="flex flex-[2] flex-col">
		<Card.Root>
			<Card.Content>
				{#if cartItems.length === 0}
					<p class="text-center text-lg text-gray-500">
						Your cart is empty. Start adding items to your cart!
					</p>
				{:else}
					{#each cartItems as item}
						<div class="flex flex-row justify-between">
							<div class="flex flex-row space-x-4">
								<img src={item.imageUrl} alt="Medicine" class="w-20" />
								<span>{item.name}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Price</span>
								<span>₱{item.price}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Qty</span>
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
								/>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Action</span>
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

	<Card.Root class="flex-1">
		<Card.Content class="flex flex-col space-y-3">
			<span class="text-xl font-medium">Cart Total</span>
			<Separator />

			<div class="flex justify-between">
				<span class="text-lg font-medium">Total</span>
				<span class="text-lg font-medium text-orange-500">
					₱{cartItems.reduce((total, item) => total + item.price * item.quantity, 0)}
				</span>
			</div>
			<span class="font-medium">Select Pickup Option:</span>
			<select bind:value={pickupOption} class="rounded border p-2">
				<option value="now">Pickup Now</option>
				<option value="later">Schedule Pickup</option>
			</select>

			{#if pickupOption === 'later'}
				<div>
					<span class="font-medium">Select Pickup Time:</span>
					<select bind:value={scheduledPickupTime} class="rounded border p-2">
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
			>
				{#if loading.proceed}
					Proceeding...
				{:else}
					Proceed to Pickup
				{/if}
			</Button>
			<Button variant="secondary" onclick={() => goto('/')}>
				<ArrowLeft />Return to Shopping
			</Button>
			<Button
				variant="secondary"
				disabled={cartItems.length === 0 || loading.clearCart}
				onclick={clearCart}
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
