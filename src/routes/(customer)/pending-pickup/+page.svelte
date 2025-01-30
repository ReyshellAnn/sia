<script lang="ts">
    import { onMount } from 'svelte';
    import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
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
  
    // Ensure user is authenticated and fetch pickup items after authentication
    onMount(() => {
      onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          // If no user is logged in, redirect to login page
          goto('/login');
          return;
        }
  
        user = currentUser; // Set user when authenticated
        loading = false; // Set loading to false once we know the user
  
        try {
          const q = query(collection(db, 'pickup'), where('userId', '==', user.uid)); // Query the pickup collection for this user
          const querySnapshot = await getDocs(q);
  
          pickupItems = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error('Error fetching pickup items:', error);
        }
      });
    });
  
    // Handle removing item from pickup
    const removeFromPickup = async (itemId: string) => {
      try {
        const itemRef = doc(db, 'pickup', itemId);
        await deleteDoc(itemRef);
        pickupItems = pickupItems.filter((item) => item.id !== itemId); // Remove from local state
        console.log('Item removed from pickup');
      } catch (error) {
        console.error('Error removing item from pickup:', error);
      }
    };
  </script>
  <span>On Going Pickups</span>
  {#if loading}
    <!-- Show loading spinner or a message while fetching the user -->
    <div>Loading...</div>
  {:else}
    <div class="flex flex-wrap gap-12">
      {#each pickupItems as item}
        <div class="flex flex-[2] flex-col">
          <Card.Root>
            <Card.Content>
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
                  <span>{item.quantity}</span>
                </div>
  
              </div>
            </Card.Content>
          </Card.Root>
        </div>
      {/each}
    </div>
  {/if}
  