<script lang="ts">
	import { onMount } from 'svelte';
	import {
		doc,
		getDoc,
		query,
		collection,
		getDocs,
		deleteDoc,
		setDoc,
		where
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state
	import { goto } from '$app/navigation'; // For navigation
	import { Button } from '$lib/components/ui/button/index.js';

	let isAuthorized = false; // Track if the user is authorized to view the content
	let pickupItems: any[] = []; // Array to store pickup items
	let errorMessage = ''; // To handle error message
	let cancelReason = ''; // To store cancel reason

	// Fetch pickup items and check user authorization
	onMount(() => {
		onAuthStateChanged(auth, async (user) => {
			if (!user) {
				console.log('No user is authenticated. Redirecting to homepage.');
				window.location.href = '/'; // Redirect to homepage
				return;
			}

			try {
				const userDocRef = doc(db, 'users', user.uid);
				const userDoc = await getDoc(userDocRef);

				if (userDoc.exists()) {
					const userData = userDoc.data();

					if (userData?.role !== 'admin') {
						console.log('User is not an admin. Redirecting to homepage.');
						window.location.href = '/'; // Redirect to homepage or other page
					} else {
						console.log('User is authenticated as an admin.');
						isAuthorized = true; // Allow access to admin content
						fetchPickupItems(); // Fetch pickup items after authorization
					}
				} else {
					console.error('User document not found in Firestore.');
					window.location.href = '/login'; // Redirect to login if user doc not found
				}
			} catch (error) {
				console.error('Error fetching user role:', error);
				errorMessage = 'An error occurred while checking user role.';
				window.location.href = '/'; // Fallback to homepage if error occurs
			}
		});
	});

	// Fetch pickup items from Firestore
	const fetchPickupItems = async () => {
		try {
			const q = query(collection(db, 'pickup')); // Query all pickup items
			const querySnapshot = await getDocs(q);
			pickupItems = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('Error fetching pickup items:', error);
		}
	};

	// Mark item as completed
  const markAsCompleted = async (itemId: string) => {
    try {
        console.log('Attempting to mark as completed for item:', itemId);

        const itemRef = doc(db, 'pickup', itemId);
        const itemSnapshot = await getDoc(itemRef);

        if (itemSnapshot.exists()) {
            console.log('Item found in pickup collection:', itemId);

            const itemData = itemSnapshot.data();

            // Move to orderhistory collection
            const orderHistoryRef = doc(db, 'orderhistory', itemId);
            await setDoc(orderHistoryRef, {
                ...itemData,
                status: 'completed',
                completedAt: new Date()
            })
            .then(() => {
                console.log('Order moved to order history:', itemId);
            })
            .catch((error) => {
                console.error('Error moving to order history for item:', itemId, error);
            });

            // Delete from pickup collection
            await deleteDoc(itemRef)
            .then(() => {
                console.log('Item deleted from pickup collection:', itemId);
            })
            .catch((error) => {
                console.error('Error deleting item from pickup for item:', itemId, error);
            });

            // Update local state by removing item from pickupItems array
            pickupItems = pickupItems.filter((item) => item.id !== itemId);
            console.log('Local state updated - item removed:', itemId);
        } else {
            console.log('Item not found in pickup collection:', itemId);
        }
    } catch (error) {
        console.error('Error marking item as completed:', error);
    }
};

// Cancel item
const cancelOrder = async (itemId: string) => {
	try {
		const itemRef = doc(db, 'pickup', itemId);
		const itemSnapshot = await getDoc(itemRef);

		if (itemSnapshot.exists()) {
			const itemData = itemSnapshot.data();

			// Move to orderhistory collection
			const orderHistoryRef = doc(db, 'orderhistory', itemId);
			await setDoc(orderHistoryRef, {
				...itemData,
				status: 'cancelled',
				cancelledAt: new Date()
			});

			// Remove from pickup collection
			await deleteDoc(itemRef);
			pickupItems = pickupItems.filter((item) => item.id !== itemId); // Update local state
			console.log('Order cancelled.');
		}
	} catch (error) {
		console.error('Error cancelling order:', error);
	}
};

</script>

{#if isAuthorized}
	<div class="admin-dashboard">
		<h1>Current Pickup Orders</h1>

		{#if pickupItems.length === 0}
			<p>No pickup orders available.</p>
		{:else}
			<div class="pickup-items">
				{#each pickupItems as item}
					<div class="pickup-item">
						<div>
							<strong>Item:</strong>
							{item.name}
						</div>
						<div>
							<strong>Price:</strong> ₱{item.price}
						</div>
						<div>
							<strong>Qty:</strong>
							{item.quantity}
						</div>
						<div>
							<Button onclick={() => markAsCompleted(item.id)}>Mark as Completed</Button>
							<Button onclick={() => cancelOrder(item.id)}>Cancel</Button>
							{#if cancelReason === item.id}
								<textarea bind:value={cancelReason} placeholder="Provide cancellation reason"
								></textarea>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message -->
{/if}
