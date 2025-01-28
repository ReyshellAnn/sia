<script lang="ts">
    import Package from "lucide-svelte/icons/package";
    import House from "lucide-svelte/icons/house";
    import History from "lucide-svelte/icons/history";
    import ChartColumnBig from "lucide-svelte/icons/chart-column-big";
    import ShoppingCart from "lucide-svelte/icons/shopping-cart";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    
    // Menu items.
    const items = [
     {
      title: "Home",
      url: "/admin",
      icon: House,
     },
     {
      title: "Inventory",
      url: "/admin/inventory",
      icon: Package,
     },
     {
      title: "Order History",
      url: "/admin/order-history",
      icon: History,
     },
     {
      title: "Statistics",
      url: "/admin/statistics",
      icon: ChartColumnBig,
     }
    ];
</script>
    
   <Sidebar.Root>
    <Sidebar.Content>
     <Sidebar.Group>
      <Sidebar.GroupLabel>MEDIQUICK (Admin Page)</Sidebar.GroupLabel>
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
   </Sidebar.Root>