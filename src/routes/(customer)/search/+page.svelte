<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { page } from '$app/state';
    import { doc, query as firestoreQuery, where } from 'firebase/firestore';
    import { auth, db } from '$lib/firebase';
    import * as Card from '$lib/components/ui/card/index.js';
    import { afterNavigate, goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button/index.js';
    import { toast } from 'svelte-sonner';
  
    import { collection, getDocs, addDoc, updateDoc, getDoc } from 'firebase/firestore';
  
    import Star from 'lucide-svelte/icons/star';
    import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
    import { writable } from 'svelte/store';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { onAuthStateChanged } from 'firebase/auth';
    
    let user = page.data.user;
    let medicines: any[] = [];
    let filteredMedicines: any[] = [];
    let searchQuery = '';
    let selectedCategory = '';
    let selectedPriceFilter = '';  // New state for price filter
    let loading: Record<string, boolean> = {};
    const showLoginDialog = writable(false);
  
    onMount(() => {
      onAuthStateChanged(auth, (currentUser) => {
        user = currentUser ? currentUser : null;
      });
    });
  
    // Function to fetch medicines based on search query
    const fetchMedicines = async (searchTerm: string) => {
      if (searchTerm) {
        try {
          const q = firestoreQuery(
            collection(db, 'medicines'),
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff')
          );
          const querySnapshot = await getDocs(q);
          medicines = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            image: doc.data().imageUrl || '/placeholder.png',
            ...doc.data()
          }));
          filterMedicines(); // Call filterMedicines after fetching data
        } catch (error) {
          console.error('Error fetching search results:', error);
        }
      }
    };
  
    // Function to filter medicines based on search & category
    const filterMedicines = () => {
      filteredMedicines = medicines.filter((med) => {
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? med.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
      });
      sortMedicines();  // Call sortMedicines to apply price sorting after filtering
    };
  
    // Function to sort medicines based on selected price filter
    const sortMedicines = () => {
      if (selectedPriceFilter === 'lowToHigh') {
        filteredMedicines.sort((a, b) => a.price - b.price);
      } else if (selectedPriceFilter === 'highToLow') {
        filteredMedicines.sort((a, b) => b.price - a.price);
      }
    };
  
    // Function to handle URL parameter changes
    const handleSearchQueryChange = () => {
      searchQuery = page.url.searchParams.get('query') || '';
      fetchMedicines(searchQuery);
    };
  
    // Set up the afterNavigate subscriber
    afterNavigate(handleSearchQueryChange);
  
    // Ensure to clean up the subscriber on component destroy
    onDestroy(() => {
      handleSearchQueryChange(); // Optionally, handle cleanup if necessary
    });
  
    // Initial fetch when the component mounts
    handleSearchQueryChange();
  
    const goToMedicine = (id: string) => {
      goto(`/medicine/${id}`);
    };
  
    const addToCart = async (medicine: any) => {
      if (!user) {
        showLoginDialog.set(true); // Show login dialog instead of redirecting
        return;
      }
  
      loading = { ...loading, [medicine.id]: true }; // Mark button as loading
  
      try {
        // Fetch medicine stock
        const medicineRef = doc(db, 'medicines', medicine.id);
        const medicineSnapshot = await getDoc(medicineRef);
  
        if (!medicineSnapshot.exists()) {
          console.error('Medicine not found');
          return;
        }
  
        const stock = medicineSnapshot.data().stock || 0;
  
        if (stock === 0) {
          // If stock is 0, show a toast and return
          toast.error(`${medicine.name} is out of stock.`);
          return;
        }
  
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
  
        if (!userDocSnap.exists()) {
          console.error('User document not found');
          return;
        }
  
        const fullName = userDocSnap.data().fullName;
        const querySnapshot = await getDocs(collection(db, 'cart'));
        const existingItem = querySnapshot.docs.find(
          (doc) => doc.data().medicineId === medicine.id && doc.data().userId === user.uid
        );
  
        if (existingItem) {
          await updateDoc(doc(db, 'cart', existingItem.id), {
            quantity: existingItem.data().quantity + 1
          });
        } else {
          await addDoc(collection(db, 'cart'), {
            userId: user.uid,
            fullName: fullName,
            medicineId: medicine.id,
            name: medicine.name,
            price: medicine.price,
            quantity: 1,
            imageUrl: medicine.image || '/placeholder.png',
            createdAt: new Date().toISOString()
          });
        }
  
        toast.success(`${medicine.name} added to cart!`);
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast.error('Failed to add item to cart.');
      } finally {
        loading = { ...loading, [medicine.id]: false }; // Reset loading state
      }
    };
  </script>
  
  <!-- Filter UI -->
  <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <select
      bind:value={selectedCategory}
      on:change={filterMedicines}
      class="w-full rounded-md border p-2 sm:w-auto"
    >
      <option value="">All Categories</option>
      <option value="Allergy & Antihistamines">Allergy & Antihistamines</option>
      <option value="Antibiotics">Antibiotics</option>
      <option value="Baby & Infant Care">Baby & Infant Care</option>
      <option value="Cough, Cold & Flu">Cough, Cold & Flu</option>
      <option value="Diabetes Care">Diabetes Care</option>
      <option value="Digestive Health">Digestive Health</option>
      <option value="First Aid & Wound Care">First Aid & Wound Care</option>
      <option value="Heart Health">Heart Health</option>
      <option value="Women's Health">Women's Health</option>
    </select>
  
    <!-- Price Filter -->
    <select
      bind:value={selectedPriceFilter}
      on:change={filterMedicines}
      class="w-full rounded-md border p-2 sm:w-auto"
    >
      <option value="">Sort by Price</option>
      <option value="lowToHigh">Price: Low to High</option>
      <option value="highToLow">Price: High to Low</option>
    </select>
  </div>
  
  <!-- Display search results -->
  <div class="p-4">
    <h2 class="text-xl font-semibold">Search Results for: {searchQuery}</h2>
    {#if medicines.length === 0}
      <p>No results found</p>
    {/if}
    <div class="flex flex-wrap justify-center sm:justify-start">
      {#each filteredMedicines as medicine}
        <Card.Root class="flex w-60 flex-col overflow-hidden rounded-none border-none bg-white">
          <Card.Content
            class="mx-auto flex items-center justify-center p-2 transition duration-200 hover:cursor-pointer"
            onclick={() => goToMedicine(medicine.id)}
          >
            <img
              src={medicine.image}
              alt="Medicine"
              class="h-52 w-full rounded-t-lg object-cover p-2 transition duration-200 group-hover:opacity-80"
            />
          </Card.Content>
  
          <div class="flex flex-grow flex-col space-y-4 p-3">
            <div class="min-h-[60px]">
              <span class="text-sm font-normal">
                <span class="font-semibold uppercase">{medicine.brand}</span>
                {medicine.generic} {medicine.dosage} {medicine.form}
              </span>
            </div>
  
            <div class="flex items-center gap-1">
              {#each Array(5) as _, i}
                <Star
                  size={16}
                  class={i < Math.round(medicine.averageRating) ? 'text-yellow-400' : 'text-gray-300'}
                />
              {/each}
              <span class="text-xs text-gray-500">({medicine.totalReviews})</span>
            </div>
  
            <div class="flex min-h-[30px] flex-col justify-center">
              <span class="text-lg font-medium text-gray-600"
                ><span class="font-normal">₱</span>{medicine.price % 1 === 0
                  ? `${medicine.price}.00`
                  : medicine.price}</span
              >
              <div class="flex flex-row justify-between">
                <span class="font-sm text-sm text-gray-500">
                  {medicine.sold > 0 ? `${medicine.sold} Sold` : ''}
                </span>
  
                <Button
                  class=" h-8 bg-green-600 hover:bg-green-700"
                  onclick={() => addToCart(medicine)}
                  disabled={loading[medicine.id]}
                >
                  {#if loading[medicine.id]}
                    <span
                      class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
                    ></span>
                  {:else}
                    <ShoppingCart />
                  {/if}
                </Button>
              </div>
            </div>
          </div>
        </Card.Root>
      {/each}
    </div>
  </div>
  
  {#if $showLoginDialog}
    <Dialog.Root bind:open={$showLoginDialog}>
      <Dialog.Content class="sm:max-w-[400px]">
        <Dialog.Header>
          <Dialog.Title>Login Required</Dialog.Title>
          <Dialog.Description>You need to be logged in to add to cart.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer class="flex justify-end gap-4">
          <Button variant="outline" onclick={() => showLoginDialog.set(false)}>Cancel</Button>
          <Button onclick={() => goto('/login')}>Login</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
  