<script lang="ts">
	import { page } from '$app/stores'; // Import to track the current route
	import Package from 'lucide-svelte/icons/package';
	import House from 'lucide-svelte/icons/house';
	import LogOut from 'lucide-svelte/icons/log-out';
	import History from 'lucide-svelte/icons/history';
	import ChartColumnBig from 'lucide-svelte/icons/chart-column-big';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { auth } from '$lib/firebase'; // Import Firebase Auth
	import { goto } from '$app/navigation';
	import { signOut } from 'firebase/auth'; // Firebase signOut method

	// Menu items
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
		},
		{
			title: 'test',
			url: '/admin/test',
			icon: ChartColumnBig
		}
	];

	const handleLogout = async () => {
	// Step 1: Call the API route to clear the session cookie
	console.log('Sending logout request to /api/logout...');
	try {
		const response = await fetch('/api/logout', {
			method: 'POST',
		});

		const result = await response.json();

		if (response.ok && result.success) {
			console.log('Session cookie cleared successfully.');

			// Step 2: Sign out from Firebase
			console.log('Signing out from Firebase...');
			await auth.signOut();

			// Step 3: Redirect to the login page
			console.log('Redirecting to the login page...');
			goto('/login');
		} else {
			console.error('Error during logout:', result.error);
			// Optionally show a toast error or other UI feedback here
		}
	} catch (error) {
		console.error('Logout failed:', error);
		// Optionally show a toast error or other UI feedback here
	}
};
</script>

<Sidebar.Root>
	<Sidebar.Header
		class="items-center justify-center bg-white py-6 text-center text-lg font-bold text-orange-400"
	>
		<span>MEDI<span class="text-black">QUICK</span></span>
		<span class="text-sm font-semibold text-black">(ADMIN)</span>
	</Sidebar.Header>

	<Sidebar.Content class="bg-white">
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="font-medium">
					{#each items as item (item.title)}
						<Sidebar.MenuItem
							class="transform rounded-lg border-2 border-transparent transition-all duration-200 ease-in-out hover:scale-105 hover:border-orange-400 hover:shadow-lg {$page
								.url.pathname === item.url
								? 'border-orange-400'
								: ''}"
						>
							<Sidebar.MenuButton
								class="flex items-center rounded-lg p-6 uppercase text-black hover:bg-transparent hover:text-orange-400 focus:text-orange-400 active:text-orange-400 {$page
									.url.pathname === item.url
									? 'text-orange-400'
									: ''}"
							>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon class="mr-4" />
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

	<Sidebar.Footer class="bg-white">
		<Button
			variant="ghost"
			class="flex items-start justify-start rounded-lg border-2 border-transparent uppercase text-black hover:bg-transparent hover:text-orange-400"
			onclick={handleLogout}
		>
			<LogOut class="my-auto mr-4" />
			<span class="my-auto">Log out</span>
		</Button>
	</Sidebar.Footer>
</Sidebar.Root>
