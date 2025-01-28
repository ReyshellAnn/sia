<script lang="ts">
	import Package from 'lucide-svelte/icons/package';
	import House from 'lucide-svelte/icons/house';
	import LogOut from 'lucide-svelte/icons/log-out';
	import History from 'lucide-svelte/icons/history';
	import ChartColumnBig from 'lucide-svelte/icons/chart-column-big';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { auth } from '$lib/firebase'; // Import Firebase Auth
	import { signOut } from 'firebase/auth'; // Firebase signOut method

	// Menu items.
	const items = [
		{
			title: 'Home',
			url: '/admin',
			icon: House
		},
		{
			title: 'Inventory',
			url: '/admin/inventory',
			icon: Package
		},
		{
			title: 'Order History',
			url: '/admin/order-history',
			icon: History
		},
		{
			title: 'Statistics',
			url: '/admin/statistics',
			icon: ChartColumnBig
		}
	];

	// Logout function
	async function logout() {
		try {
			await signOut(auth); // Sign out the user
			console.log('User logged out successfully.');
			window.location.href = '/admin-login'; // Redirect to the login page
		} catch (error) {
			console.error('Error during logout:', error);
		}
	}
</script>

<Sidebar.Root>
	<Sidebar.Header class="items-center justify-center">MEDIQUICK ADMIN</Sidebar.Header>
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
	<Sidebar.Footer>
		<Button variant="ghost" class="items-start justify-start" onclick={logout}>
			<LogOut />
			Log out
		</Button>
	</Sidebar.Footer>
</Sidebar.Root>
