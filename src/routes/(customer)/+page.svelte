<script lang="ts">
  import { onMount } from 'svelte';
  import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
  import { db } from '$lib/firebase';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { goto } from '$app/navigation';  // Use goto from $app/navigation
  import { page } from '$app/state'; // Get user information from the state
  import { auth } from '$lib/firebase'; // Firebase auth
  import { onAuthStateChanged } from 'firebase/auth';

  let medicines: any[] = [];
  let user = page.data.user; // Assuming user data is stored in page.data

  // Check authentication status on mount
  onMount(() => {
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Update user in page data or state store
        user = currentUser;
      } else {
        user = null; // Ensure user is set to null if not authenticated
      }
    });
  });

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

  const addToCart = async (medicine: any) => {
  if (!user) {
    // Redirect to login page if user is not logged in
    goto('/login');
    return;
  }

  try {
    // Query the cart to check if the product already exists
    const querySnapshot = await getDocs(collection(db, 'cart'));
    const existingItem = querySnapshot.docs.find(doc => doc.data().medicineId === medicine.id && doc.data().userId === user.uid);

    if (existingItem) {
      // If the product is already in the cart, update the quantity
      const cartItemRef = doc(db, 'cart', existingItem.id); // Get the reference of the existing cart item
      await updateDoc(cartItemRef, {
        quantity: existingItem.data().quantity + 1, // Increase the quantity by 1
      });
      console.log('Quantity updated for item in cart');
    } else {
      // If the product is not in the cart, add a new item
      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        medicineId: medicine.id,
        name: medicine.name,
        price: medicine.price,
        quantity: 1, // Starting quantity for the item
        createdAt: new Date().toISOString(),
      });
      console.log('Item added to cart');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
};
</script>


<div class="flex flex-wrap gap-4">
  {#each medicines as medicine}
    <Card.Root class="w-72">
      <Card.Content class="p-0 mx-auto flex items-center justify-center" onclick={() => goToMedicine(medicine.id)}> 
        <img src={medicine.image} alt="Medicine" class="w-64" />
      </Card.Content>
      
      <Card.Footer class="flex flex-col items-start p-2 space-y-3">
        <span class="text-lg font-normal">{medicine.name}</span>
        <span class="text-lg font-medium">₱{medicine.price}</span>
        <Button class="w-full" onclick={() => addToCart(medicine)}>Add To Cart</Button>
      </Card.Footer>
    </Card.Root>
  {/each}
</div>
