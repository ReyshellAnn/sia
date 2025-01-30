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
		// Redirect to login page or perform other actions after logout
		window.location.href = '/';
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
		<Button variant="ghost" class="items-start justify-start" onclick={handleLogout}>
			<LogOut />
			Log out
		</Button>
	</Sidebar.Footer>
	{/if}
</Sidebar.Root>
