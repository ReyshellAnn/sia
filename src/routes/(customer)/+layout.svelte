<script lang="ts">
	import '../../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { goto } from '$app/navigation';
	import { Toaster } from 'svelte-sonner';

	import CustomerSidebar from '$lib/components/customer-sidebar.svelte';

	import BellRing from 'lucide-svelte/icons/bell-ring';
	import Lock from 'lucide-svelte/icons/lock';
	import Settings from 'lucide-svelte/icons/settings';
	import User from 'lucide-svelte/icons/user';
	import LogOut from 'lucide-svelte/icons/log-out';

	import { user } from '$lib/stores/authStore'; // Import the user store
	import { auth } from '$lib/firebase';

	let isMobile = $state(false);
	// svelte-ignore non_reactive_update
	let searchQuery = '';

	const goToSearchPage = () => {
		if (searchQuery.trim()) {
			// Ensure the query is trimmed and only navigate when it's non-empty
			goto(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	onMount(() => {
		if (!browser) return; // Prevent execution on the server

		// Screen size detection
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		isMobile = mediaQuery.matches;

		const updateSize = (event: MediaQueryListEvent) => {
			isMobile = event.matches;
		};

		mediaQuery.addEventListener('change', updateSize);

		// Scroll event listener
		window.addEventListener('scroll', handleScroll);

		// Cleanup function
		return () => {
			mediaQuery.removeEventListener('change', updateSize);
			window.removeEventListener('scroll', handleScroll);
		};
	});

	let { children } = $props();

	const handleLogout = async () => {
		// Step 1: Call the API route to clear the session cookie
		console.log('Sending logout request to /api/logout...');
		try {
			const response = await fetch('/api/logout', {
				method: 'POST'
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

	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

	// Store to track scroll state
	const hasScrolled = writable(false);

	// Function to handle scroll event
	const handleScroll = () => {
		hasScrolled.set(window.scrollY > 0); // If scrolled, set to true
	};

	import { browser } from '$app/environment';
</script>

<Sidebar.Provider style="--sidebar-width-mobile: 6rem;">
	<CustomerSidebar />
	<Sidebar.Inset class="bg-primary-foreground">
		<header
			class="sticky top-0 flex h-16 shrink-0 items-center gap-2 bg-primary-foreground px-4 transition-all duration-300 ease-in-out
			{$hasScrolled ? 'border-b border-gray-100 shadow-lg' : ''}"
		>
			<Sidebar.Trigger class="-ml-1" />
			<!-- svelte-ignore event_directive_deprecated -->
			<form on:submit|preventDefault={() => goToSearchPage()}>
				<input
					type="text"
					placeholder="Search medicine..."
					bind:value={searchQuery}
					class="w-full rounded-md border p-2 sm:max-w-xs"
				/>
				<Button type="submit" class="hidden">Search</Button>
				<!-- Hidden submit button for accessibility -->
			</form>

			<div class="ml-auto flex items-center gap-6">
				{#if $user}
					<Tooltip.Provider delayDuration={200}>
						<Tooltip.Root>
							<Tooltip.Trigger
								onclick={() => goto('/notification')}
								class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-gray-200 hover:text-orange-400"
							>
								<BellRing size={22} />
							</Tooltip.Trigger>

							<Tooltip.Content
								align="end"
								alignOffset={15}
								class="flex w-64 flex-col items-center justify-center gap-4 rounded-lg bg-white p-4 shadow-xl"
							>
								<img
									src="/bell.png"
									alt="Notification"
									class="h-10 w-10 rounded-full object-cover"
								/>
								<!-- Add dynamic notification content -->
								<span class="p-2 text-center">You have 1 new notification!</span>
								<Button class="w-full text-sm">View Notifications</Button>
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}

				{#if isMobile}
					<!-- Popover for Mobile -->
					<Popover.Root>
						<Popover.Trigger
							class="mr-4 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-gray-200"
						>
							<Avatar.Root class="h-10 w-10">
								<Avatar.Image
									src={($user && $user.profileImageUrl) || '/panda.png'}
									alt={$user ? $user.fullName : 'User'}
									class="h-full w-full rounded-full"
								/>
								<Avatar.Fallback class="flex h-full w-full items-center justify-center">
									{#if $user}
										{$user.fullName[0]}
									{:else}
										U
									{/if}
								</Avatar.Fallback>
							</Avatar.Root>
						</Popover.Trigger>
						<Popover.Content
							align="end"
							class="flex w-full max-w-xs flex-col rounded-lg bg-white p-4 shadow-xl"
						>
							{#if $user}
								<span class="p-2 pt-4 text-center text-sm font-medium">Hi, {$user.fullName}</span>
								<Button href="/settings" variant="ghost" class="justify-start text-sm">
									<Settings class="mr-2" />Settings
								</Button>
								<Button onclick={handleLogout} variant="ghost" class="justify-start text-sm">
									<LogOut class="mr-2" />Log out
								</Button>
							{:else}
								<Button href="/login" variant="ghost" class="justify-start text-sm">
									<Lock class="mr-2" />Sign in
								</Button>
								<Button href="/register" variant="ghost" class="justify-start text-sm">
									<User class="mr-2" />Create Account
								</Button>
							{/if}
						</Popover.Content>
					</Popover.Root>
				{:else}
					<!-- Tooltip for Desktop -->
					<Tooltip.Provider delayDuration={200}>
						<Tooltip.Root>
							<Tooltip.Trigger
								class="mr-4 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-gray-200"
							>
								<Avatar.Root class="h-10 w-10">
									<Avatar.Image
										src={($user && $user.profileImageUrl) || '/panda.png'}
										alt={$user ? $user.fullName : 'User'}
										class="h-full w-full rounded-full"
									/>
									<Avatar.Fallback class="flex h-full w-full items-center justify-center">
										{#if $user}
											{$user.fullName[0]}
										{:else}
											U
										{/if}
									</Avatar.Fallback>
								</Avatar.Root>
							</Tooltip.Trigger>
							<Tooltip.Content
								align="end"
								alignOffset={15}
								class="w-sm flex flex-col rounded-lg bg-white p-4 shadow-xl"
							>
								{#if $user}
									<span class="p-2 pt-4 text-center text-sm font-medium">Hi, {$user.fullName}</span>
									<Button href="/settings" variant="ghost" class="justify-start text-sm">
										<Settings class="mr-2" />Settings
									</Button>
									<Button onclick={handleLogout} variant="ghost" class="justify-start text-sm">
										<LogOut class="mr-2" />Log out
									</Button>
								{:else}
									<Button href="/login" variant="ghost" class="justify-start text-sm">
										<Lock class="mr-2" />Sign in
									</Button>
									<Button href="/register" variant="ghost" class="justify-start text-sm">
										<User class="mr-2" />Create Account
									</Button>
								{/if}
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{/if}
			</div>
		</header>

		<div class="flex flex-1 flex-col gap-4 overflow-auto p-0 md:p-4">
			<Toaster />
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
