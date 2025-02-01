<script lang="ts">
    import { onMount } from 'svelte';
    import { MediaQuery } from 'svelte/reactivity';
    import { toast } from 'svelte-sonner';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import { db } from '$lib/firebase'; // Firebase Firestore reference
    import { user } from '$lib/stores/authStore'; // Auth store
	import * as Table from '$lib/components/ui/table/index.js';
    import * as Pagination from '$lib/components/ui/pagination/index.js';
    import ChevronLeft from 'lucide-svelte/icons/chevron-left';
    import ChevronRight from 'lucide-svelte/icons/chevron-right';
  
    const isDesktop = new MediaQuery('(min-width: 768px)');
    const count = 20;
    const perPage = $derived(isDesktop.current ? 3 : 8);
    const siblingCount = $derived(isDesktop.current ? 1 : 0);
  
    interface OrderHistory {
      id: string;
      medicineId: string;
      name: string;
      price: number;
      quantity: number;
      status: string;
      createdAt: string;
      completedAt: string;
    }
  
    let orders = $state<OrderHistory[]>([]); // Store user's order history
    let isLoading = $state(false);
    let errorMessage = $state('');
  
    onMount(async () => {
      user.subscribe(async (currentUser) => {
        if (!currentUser) {
          console.log('User not authenticated, redirecting to login.');
          window.location.href = '/login';
          return;
        }
        
        try {
          isLoading = true;
          const ordersQuery = query(
            collection(db, 'orderhistory'),
            where('userId', '==', currentUser.uid)
          );
          const querySnapshot = await getDocs(ordersQuery);
          orders = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as OrderHistory[];
        } catch (error) {
          console.error('Error fetching orders:', error);
          errorMessage = 'Failed to load order history.';
        } finally {
          isLoading = false;
        }
      });
    });
  </script>
  
  {#if errorMessage}
    <p class="text-red-500">{errorMessage}</p>
  {:else}
    <header class="flex flex-row justify-between px-2">
      <span class="text-2xl font-semibold">My Orders</span>
    </header>
  
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Order ID</Table.Head>
          <Table.Head>Name</Table.Head>
          <Table.Head>Price</Table.Head>
          <Table.Head>Quantity</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Date</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each orders as order (order.id)}
          <Table.Row>
            <Table.Cell class="font-medium">{order.id}</Table.Cell>
            <Table.Cell>{order.name}</Table.Cell>
            <Table.Cell>₱{order.price.toFixed(2)}</Table.Cell>
            <Table.Cell>{order.quantity}</Table.Cell>
            <Table.Cell>{order.status}</Table.Cell>
            <Table.Cell>{new Date(order.createdAt).toLocaleString()}</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  
    <Pagination.Root {count} {perPage} {siblingCount} class="items-end">
      {#snippet children({ pages, currentPage })}
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.PrevButton>
              <ChevronLeft class="size-4" />
              <span class="hidden sm:block">Previous</span>
            </Pagination.PrevButton>
          </Pagination.Item>
          {#each pages as page (page.key)}
            {#if page.type === 'ellipsis'}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link {page} isActive={currentPage === page.value}>
                  {page.value}
                </Pagination.Link>
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item>
            <Pagination.NextButton>
              <span class="hidden sm:block">Next</span>
              <ChevronRight class="size-4" />
            </Pagination.NextButton>
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  {/if}
  