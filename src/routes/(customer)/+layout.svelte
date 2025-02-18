<script lang="ts">
	import '../../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
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

	let { children } = $props();

	const handleLogout = async () => {
		await auth.signOut();
		goto('/login'); // Smooth, client-side navigation
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

	onMount(() => {
		if (!browser) return; // Prevent execution on the server
		window.addEventListener('scroll', handleScroll);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('scroll', handleScroll);
	});
</script>

<Sidebar.Provider>
	<CustomerSidebar />
	<Sidebar.Inset class="bg-primary-foreground">
		<header
			class="sticky top-0 flex h-16 shrink-0 items-center gap-2 bg-primary-foreground px-4 transition-all duration-300 ease-in-out 
			{$hasScrolled ? 'border-b border-gray-100 shadow-lg' : ''}"
		>
			<Sidebar.Trigger class="-ml-1" />

			<div class="ml-auto flex items-center gap-6">
				{#if $user}
					<Tooltip.Provider delayDuration={200}>
						<Tooltip.Root>
							<Tooltip.Trigger
								onclick={() => goto('/notification')}
								class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-200 hover:text-orange-400 transition-all"
							>
								<BellRing size={22} />
							</Tooltip.Trigger>

							<Tooltip.Content
								align="end"
								alignOffset={15}
								class="flex w-64 flex-col items-center justify-center gap-4 p-4 bg-white rounded-lg shadow-xl"
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

				<Tooltip.Provider delayDuration={200}>
					<Tooltip.Root>
						<Tooltip.Trigger
							class="mr-4 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-200 transition-all"
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
						<Tooltip.Content align="end" alignOffset={15} class="flex w-40 flex-col p-4 bg-white rounded-lg shadow-xl">
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
			</div>
		</header>

		<div class="flex flex-1 flex-col gap-4 p-4 overflow-auto">
			<Toaster />
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>