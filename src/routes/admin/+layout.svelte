<script lang="ts">
	import '../../app.css';
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import AdminSidebar from "$lib/components/admin-sidebar.svelte";
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Toaster } from 'svelte-sonner';
	let { children } = $props();
</script>

<Sidebar.Provider>
	<AdminSidebar />
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
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4">
			<Toaster />
			{@render children?.()}
		</div>
	</Sidebar.Inset>
  </Sidebar.Provider>