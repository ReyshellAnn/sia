<script lang="ts">
	import { page } from '$app/stores'; // Import to track the current route
	import Loader from 'lucide-svelte/icons/loader';
	import Pill from 'lucide-svelte/icons/pill';
	import Settings from 'lucide-svelte/icons/settings';
	import LogOut from 'lucide-svelte/icons/log-out';
	import History from 'lucide-svelte/icons/history';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { user } from '$lib/stores/authStore'; // Import the user store
	import { auth } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';

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
	const showLoginDialog = writable(false);

	// Handle clicking on Cart
	const handleCartClick = (event: Event) => {
		if (!$user) {
			event.preventDefault(); // Prevent navigation
			showLoginDialog.set(true); // Show dialog instead
		}
	};

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
		<span>MEDI<span class="text-black">QUICK</span> </span>
	</Sidebar.Header>
	<Sidebar.Content class="bg-white">
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="font-medium">
					{#each items.filter((item) => $user || !['Settings', 'Pending Pickups', 'Order History'].includes(item.title)) as item (item.title)}
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
									<a
										href={item.url}
										{...props}
										on:click={item.title === 'Cart' ? handleCartClick : undefined}
									>
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
	{#if $user}
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
	{/if}
</Sidebar.Root>
<!-- Login Dialog -->
<Dialog.Root bind:open={$showLoginDialog}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>Login Required</Dialog.Title>
			<Dialog.Description>You need to be logged in to access your cart.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-4">
			<Button variant="outline" onclick={() => showLoginDialog.set(false)}>Cancel</Button>
			<Button onclick={() => goto('/login')}>Login</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
