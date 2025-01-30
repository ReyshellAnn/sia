<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { page } from '$app/state'; // To access user information from state
	import { goto } from '$app/navigation'; // For navigation
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import { auth } from '$lib/firebase'; // Import Firebase auth
	import { onAuthStateChanged } from 'firebase/auth'; // To track user auth state

	let user = page.data.user; // Access logged-in user from page state
	let cartItems: any[] = []; // Array to store cart items

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
					...doc.data()
				}));
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
		try {
			const itemRef = doc(db, 'cart', itemId);
			await deleteDoc(itemRef);
			cartItems = cartItems.filter((item) => item.id !== itemId); // Remove from local state
			console.log('Item removed from cart');
		} catch (error) {
			console.error('Error removing item from cart:', error);
		}
	};

	const proceedToPickup = async () => {
    try {
        // Move items to the pickup collection
        const batch = writeBatch(db); // Firebase batch operation to ensure atomicity

        // Add each item from cart to pickup collection
        for (const item of cartItems) {
            const pickupRef = doc(db, 'pickup', item.id); // Use item.id as document ID
            batch.set(pickupRef, item); // Add item to pickup collection with the same ID as in cart
            const cartRef = doc(db, 'cart', item.id);
            batch.delete(cartRef); // Remove item from cart
        }

        await batch.commit(); // Commit the batch operation
        console.log('Items moved to pickup and removed from cart');

        // Redirect to pickup page
        goto('/pending-pickup');
    } catch (error) {
        console.error('Error proceeding to pickup:', error);
    }
};

</script>

<div class="flex flex-wrap gap-12">
	<div class="flex flex-[2] flex-col">
		<Card.Root>
			<Card.Content>
				{#each cartItems as item}
					<div class="flex flex-row justify-between">
						<div class="flex flex-row space-x-4">
							<img src="/placeholder.png" alt="Medicine" class="w-20" />
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
								class=" rounded-full text-red-600 hover:text-red-900"
								onclick={() => removeFromCart(item.id)}
							>
								<Trash2 />
							</Button>
						</div>
					</div>

					<Separator />
				{/each}
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
			<Button onclick={proceedToPickup}>Proceed to Pickup</Button>
			<Button variant="secondary" onclick={() => goto('/')}>
				<ArrowLeft />Return to Shopping
			</Button>
			<Button variant="secondary"><Trash2 />Clear Cart</Button>
		</Card.Content>
	</Card.Root>
</div>
