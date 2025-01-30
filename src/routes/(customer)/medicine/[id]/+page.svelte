<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
  import { db } from '$lib/firebase';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Input from '$lib/components/ui/input/input.svelte';
  import * as Carousel from "$lib/components/ui/carousel/index.js";
  import Separator from '$lib/components/ui/separator/separator.svelte';
  import { page } from '$app/state';  // To access URL parameters
  import { goto, onNavigate } from '$app/navigation';  // Import for navigation and onNavigate
  
  let medicine: any = null;
  let medicines: any[] = [];
  let currentId: string;

  // Fetch the medicine based on the id from the URL
  const fetchMedicine = async () => {
    currentId = page.params.id;  // Access the id from the URL

    if (!currentId) {
      console.error('No medicine id found in the URL');
      return;
    }

    try {
      const docRef = doc(db, 'medicines', currentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        medicine = docSnap.data();
      } else {
        console.log('No such document!');
      }

      // Fetch other medicines for recommendations
      const querySnapshot = await getDocs(collection(db, 'medicines'));
      medicines = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        image: '/placeholder.png'
      }));
    } catch (error) {
      console.error('Error fetching medicine details:', error);
    }
  };

  // Re-fetch when the URL changes
  afterUpdate(() => {
    if (page.params.id !== currentId) {
      fetchMedicine();
    }
  });

  onMount(() => {
    fetchMedicine();
  });

  // Handle carousel item click
  const goToMedicine = (id: string) => {
    goto(`/medicine/${id}`);  // Navigate to the /medicine page with the selected id
  };
</script>

{#if medicine}
<div class="flex flex-row">
  <Card.Root class="flex-1 border-none shadow-none">
    <Card.Content class="mx-auto flex items-center justify-center p-0">
      <img src="/placeholder.png" alt="Medicine" class="w-86" />
    </Card.Content>
  </Card.Root>
  <Card.Root class="flex-1 border-none shadow-none">
    <Card.Content class="mx-auto flex flex-col items-start justify-start space-y-2 p-2">
      <span class="text-2xl font-medium">{medicine.name}</span>
      <span class="text-xl font-medium">₱{medicine.price}</span>

      <span class="text-sm font-normal">Stock: {medicine.stock || 100}</span>
      
      <Separator />
      
      <span class="text-base font-medium">Quantity</span>
      <div class="flex w-full flex-row gap-2">
        <Input type="number" value="0" class="w-24" />
        <Button class="flex-1">Add To Cart</Button>
      </div>

      <span class="text-lg font-medium">About the Product</span>
      <span>{medicine.description || 'No description available'}</span>
    </Card.Content>
  </Card.Root>
</div>

<Card.Root>
  <Card.Content><Card.Title>You may also like</Card.Title></Card.Content>
</Card.Root>
<div class="flex justify-center items-center w-full">
  <!-- Carousel-->
  <Carousel.Root class="w-full max-w-6xl">
    <Carousel.Content class="-ml-1">
      {#each medicines.filter(m => m.id !== currentId) as medicine, i (i)}  <!-- Exclude the current medicine -->
        <Carousel.Item class="pl-1 md:basis-1/3 lg:basis-1/4" onclick={() => goToMedicine(medicine.id)}>
          <div class="p-1">
            <Card.Root>
              <Card.Content class="flex aspect-square items-center justify-center p-6">
                <!-- Product Image -->
                <img src={medicine.image} alt="Medicine" class="w-64" />
              </Card.Content>

              <Card.Footer class="flex flex-col items-start space-y-3 p-2">
                <!-- Product Name -->
                <span class="text-lg font-normal">{medicine.name}</span>
                <!-- Product Price -->
                <span class="text-lg font-medium">₱{medicine.price}</span>
                <!-- Add to Cart Button -->
                <Button class="w-full">Add To Cart</Button>
              </Card.Footer>
            </Card.Root>
          </div>
        </Carousel.Item>
      {/each}
    </Carousel.Content>

    <!-- Carousel Navigation -->
    <Carousel.Previous />
    <Carousel.Next />
  </Carousel.Root>
</div>
{/if}
