<script lang="ts">
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where, doc, deleteDoc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { auth } from '$lib/firebase'; // Import Firebase auth
	import { onAuthStateChanged } from 'firebase/auth'; // To track user auth state
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import { goto } from '$app/navigation'; // For navigation

	let user = null; // Initialize as null
	let pickupItems: any[] = []; // Array to store pickup items
	let loading = true; // To track if the page is still loading the user
  let totalPrice = 0; // Initialize total price

  onMount(() => {
    onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
            goto('/login');
            return;
        }

        user = currentUser;
        loading = false;

        try {
            const q = query(collection(db, 'pickup'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            // Fetch all pickup items
            let items = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    medicineId: data.medicineId || null, // Ensure medicineId exists
                    name: data.name,
                    price: data.price,
                    quantity: data.quantity
                };
            });

            console.log("Pickup items before fetching images:", items);

            // Fetch medicine images for each item
            const updatedItems = await Promise.all(
                items.map(async (item) => {
                    if (item.medicineId) {
                        const medicineRef = doc(db, 'medicines', item.medicineId);
                        const medicineSnap = await getDoc(medicineRef);

                        if (medicineSnap.exists()) {
                            return {
                                ...item,
                                imageUrl: medicineSnap.data().imageUrl || '/placeholder.png'
                            };
                        }
                    }
                    return { ...item, imageUrl: '/placeholder.png' };
                })
            );

            pickupItems = updatedItems; // Assign updated items with images
            console.log("Pickup items after fetching images:", pickupItems);

            // Calculate total price after fetching the items
            totalPrice = pickupItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        } catch (error) {
            console.error('Error fetching pickup items:', error);
        }
    });
});

</script>

<span>On Going Pickups</span>
{#if loading}
	<!-- Show loading spinner or a message while fetching the user -->
	<div>Loading...</div>
{:else}
	<!-- Add message for readying the total bill -->
	<div class="alert alert-info">
		<p class="font-bold">Please ready your total bill for your pickup</p>
	</div>

	<!-- Show total amount -->
	<div class="mt-4">
		<span class="text-lg font-bold">Total Bill: ₱{totalPrice}</span>
	</div>
	<div class="flex flex-col gap-2">
		{#each pickupItems as item}
			<div class="flex flex-[2] flex-col">
				<Card.Root>
					<Card.Content>
						<div class="flex flex-row justify-between">
							<div class="flex flex-row space-x-4">
								<img src="{item.imageUrl}" alt="Medicine" class="w-20" />
								<span>{item.name}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Price</span>
								<span>₱{item.price}</span>
							</div>

							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Qty</span>
								<span>{item.quantity}</span>
							</div>

							<!-- Display the Pickup Time -->
							<div class="flex flex-col">
								<span class="text-sm text-gray-600">Pickup Time</span>
								<span>{item.pickupTime}</span>
								<!-- Displaying pickup time -->
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	</div>
{/if}
