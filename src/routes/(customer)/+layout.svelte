<script lang="ts">
	import '../../app.css';
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import CustomerSidebar from "$lib/components/customer-sidebar.svelte";
	let { children } = $props();
</script>

<Sidebar.Provider>
	<CustomerSidebar />
	<main>
	  <Sidebar.Trigger />
	  {@render children?.()}
	</main>
  </Sidebar.Provider>