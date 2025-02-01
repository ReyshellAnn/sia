<script lang="ts">
	import Loader from 'lucide-svelte/icons/loader';
	import Pill from 'lucide-svelte/icons/pill';
	import Settings from 'lucide-svelte/icons/settings';
	import LogOut from 'lucide-svelte/icons/log-out';
	import History from 'lucide-svelte/icons/history';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { user } from '$lib/stores/authStore'; // Import the user store
	import { auth } from '$lib/firebase';
	import { goto } from '$app/navigation';


	// Menu items.
	const items = [
		{
			title: 'Medicines',
			url: '/',
			icon: Pill
		},
		{
			title: 'Cart',
			url: '/cart',
			icon: ShoppingCart
		},
		{
			title: 'Pending Pickups',
			url: '/pending-pickup',
			icon: Loader
		},
		{
			title: 'Order History',
			url: '/order-history',
			icon: History
		},
		{
			title: 'Settings',
			url: '/settings',
			icon: Settings
		}
	];

	// Function to handle logout
	const handleLogout = async () => {
    await auth.signOut();
    goto('/login'); // Smooth, client-side navigation
};
</script>

<Sidebar.Root>
	<Sidebar.Header class="items-center justify-center font-bold text-center text-orange-400 bg-white py-6 text-lg">
		<span>MEDI<span class="text-black">QUICK</span>
		</span> 
	</Sidebar.Header>
	<Sidebar.Content class="bg-white">
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="font-medium">
					{#each items as item (item.title)}
					<Sidebar.MenuItem class="border-2 border-transparent rounded-lg hover:border-orange-400 hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105">
						<Sidebar.MenuButton class="flex items-center p-6 rounded-lg uppercase hover:bg-transparent hover:text-orange-400 text-black">
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon class="mr-4"/>
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	{#if $user}
	<Sidebar.Footer class="bg-white">
		<Button variant="ghost" class="border-2 border-transparent flex items-start justify-start rounded-lg uppercase hover:bg-transparent hover:text-orange-400 text-black" onclick={handleLogout}>
			<LogOut class="my-auto mr-4" />
			<span class="my-auto">Log out</span>
		  </Button>
		  
	</Sidebar.Footer>
	{/if}
</Sidebar.Root>
