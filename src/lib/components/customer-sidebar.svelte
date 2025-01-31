<script lang="ts">
	import Loader from 'lucide-svelte/icons/loader';
	import Pill from 'lucide-svelte/icons/pill';
	import LogOut from 'lucide-svelte/icons/log-out';
	import History from 'lucide-svelte/icons/history';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { user } from '$lib/stores/authStore'; // Import the user store
	import { auth } from '$lib/firebase';


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
		}
	];

	// Function to handle logout
	const handleLogout = async () => {
		await auth.signOut();
	};
</script>

<Sidebar.Root>
	<Sidebar.Header class="items-center justify-center">MEDIQUICK</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon />
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
	<Sidebar.Footer>
		<Button variant="ghost" class="flex items-start justify-start p-2" onclick={handleLogout}>
			<LogOut class="my-auto" />
			<span class="my-auto">Log out</span>
		  </Button>
		  
	</Sidebar.Footer>
	{/if}
</Sidebar.Root>
