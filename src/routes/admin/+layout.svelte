<script lang="ts">
	import '../../app.css';
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import AdminSidebar from "$lib/components/admin-sidebar.svelte";
	let { children } = $props();
</script>

<Sidebar.Provider>
	<AdminSidebar />
	<main>
	  <Sidebar.Trigger />
	  {@render children?.()}
	</main>
  </Sidebar.Provider>