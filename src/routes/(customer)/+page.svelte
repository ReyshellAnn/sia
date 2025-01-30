  <script lang="ts">
    import { onMount } from 'svelte';
    import { collection, getDocs } from 'firebase/firestore';
    import { db } from '$lib/firebase';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { goto } from '$app/navigation';  // Use goto from $app/navigation

    let medicines: any[] = [];

    // Fetch medicines from Firestore
    onMount(async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'medicines'));
        medicines = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,  // Adjust to match your field names
          price: doc.data().price, // Adjust to match your field names
          image: '/placeholder.png' // Use a placeholder or field from Firestore if available
        }));
      } catch (error) {
        console.error('Error fetching medicines:', error);
      }
    });

    // Handle medicine click
    const goToMedicine = (id: string) => {
      goto(`/medicine/${id}`);  // Navigate to the /medicine page with the selected id
    };
  </script>

  <div class="flex flex-wrap gap-4">
    {#each medicines as medicine}
      <Card.Root class="w-72" onclick={() => goToMedicine(medicine.id)}>
        <Card.Content class="p-0 mx-auto flex items-center justify-center">
          <img src={medicine.image} alt="Medicine" class="w-64" />
        </Card.Content>
        
        <Card.Footer class="flex flex-col items-start p-2 space-y-3">
          <span class="text-lg font-normal">{medicine.name}</span>
          <span class="text-lg font-medium">₱{medicine.price}</span>
          <Button class="w-full">Add To Cart</Button>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
