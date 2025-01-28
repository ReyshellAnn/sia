<script lang="ts">
	import '../../app.css';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CustomerSidebar from '$lib/components/customer-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	let { children } = $props();
	
	import Lock from "lucide-svelte/icons/lock";
	import User from "lucide-svelte/icons/user";
</script>

<Sidebar.Provider>
	<CustomerSidebar />
	<Sidebar.Inset>
		<header class="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
			<Sidebar.Trigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-2 h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/">Medicines</Breadcrumb.Link>
					</Breadcrumb.Item>
					<!-- <Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
					</Breadcrumb.Item> -->
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<div class="ml-auto">
				<Tooltip.Provider delayDuration={0}>
					<Tooltip.Root>
						<Tooltip.Trigger class={`${buttonVariants({ variant: 'ghost' })} rounded-full hover:bg-transparent`}>
							<Avatar.Root>
								<Avatar.Image src="https://avatar.iran.liara.run/public/girl" alt="@shadcn" />
								<Avatar.Fallback>CN</Avatar.Fallback>
							</Avatar.Root>
						</Tooltip.Trigger>
						<Tooltip.Content align="end" alignOffset={15} class="flex flex-col p-0">
							<Button href="/login" variant="ghost" class="justify-start"><Lock />Sign in</Button>
							<Button href="/register" variant="ghost" class="justify-start"><User />Create Account</Button>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4">
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
