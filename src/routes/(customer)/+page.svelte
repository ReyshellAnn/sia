<script lang="ts">
  import { onMount } from 'svelte';
  import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
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
    medicines = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Fetched medicine data:', data); 
      return {
        id: doc.id,
        name: data.name,  // Adjust to match your field names
        price: data.price, // Adjust to match your field names
        image: data.imageUrl || '/placeholder.png' // Fetch image URL from Firestore (or use placeholder)
      };
    });
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
    goto('/login');
    return;
  }

  try {
    console.log('Medicine data before adding to cart:', medicine); // Debugging log

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return;
    }

    const fullName = userDocSnap.data().fullName;

    const querySnapshot = await getDocs(collection(db, 'cart'));
    const existingItem = querySnapshot.docs.find(doc => 
      doc.data().medicineId === medicine.id && doc.data().userId === user.uid
    );

    const imageUrl = medicine.image || '/placeholder.png';

    if (existingItem) {
      const cartItemRef = doc(db, 'cart', existingItem.id);
      await updateDoc(cartItemRef, {
        quantity: existingItem.data().quantity + 1,
      });
      console.log('Quantity updated for item in cart');
    } else {
      console.log('Adding to cart with imageUrl:', imageUrl); // Debugging log

      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        fullName: fullName,
        medicineId: medicine.id,
        name: medicine.name,
        price: medicine.price,
        quantity: 1,
        imageUrl: imageUrl,
        createdAt: new Date().toISOString(),
      });

      console.log('Item added to cart with imageUrl:', imageUrl);
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
};

</script>


<div class="flex flex-wrap gap-4">
  {#each medicines as medicine}
    <Card.Root class="w-72">
      <Card.Content class="p-0 mx-auto flex items-center justify-center hover:cursor-pointer hover:bg-primary-foreground" onclick={() => goToMedicine(medicine.id)}>
        <!-- Image alignment fix -->
        <img src={medicine.image} alt="Medicine" class="w-full h-48 object-cover rounded-md" />
      </Card.Content>
      <Card.Footer class="flex flex-col items-start p-2 space-y-3">
        <span class="text-lg font-normal">{medicine.name}</span>
        <span class="text-lg font-medium">₱{medicine.price}</span>
        <Button class="w-full" onclick={() => addToCart(medicine)}>Add To Cart</Button>
      </Card.Footer>
    </Card.Root>
  {/each}
</div>
