<script lang="ts">
	import '../../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CustomerSidebar from '$lib/components/customer-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { goto } from '$app/navigation';
	import { Toaster } from 'svelte-sonner';

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
</script>

<Sidebar.Provider>
	<CustomerSidebar />
	<Sidebar.Inset class="bg-primary-foreground">
		<header class="sticky top-0 flex h-16 shrink-0 items-center gap-2 px-4">
			<Sidebar.Trigger class="-ml-1" />
			<!-- <Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/">Medicines</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root> -->

			<div class="ml-auto">
				<Tooltip.Provider delayDuration={0}>
					<Tooltip.Root>
						<Tooltip.Trigger
							class={buttonVariants({ variant: 'ghost' }) + ' rounded-full hover:bg-transparent'}
						>
						<Avatar.Root>
							<!-- Use the profileImageUrl from the user store -->
							<Avatar.Image 
								src={($user && $user.profileImageUrl) || '/placeholder.png'} 
								alt={$user ? $user.fullName : "User"} 
							/>
							<Avatar.Fallback>
								<!-- Fallback text in case no profile image is available -->
								{#if $user}
									{$user.fullName[0]}
								{:else}
									U
								{/if}
							</Avatar.Fallback>
						</Avatar.Root>
						</Tooltip.Trigger>
						<Tooltip.Content align="end" alignOffset={15} class="flex flex-col p-0">
							{#if $user}
								<span class="p-2 text-sm font-medium">Hi, {$user.fullName}</span>
								<Button href="/settings" variant="ghost" class="justify-start">
									<Settings />Settings
								</Button>
								<Button onclick={handleLogout} variant="ghost" class="justify-start">
									<LogOut />Log out
								</Button>
							{:else}
								<Button href="/login" variant="ghost" class="justify-start">
									<Lock />Sign in
								</Button>
								<Button href="/register" variant="ghost" class="justify-start">
									<User />Create Account
								</Button>
							{/if}
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4">
			<Toaster />
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
