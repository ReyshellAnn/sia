<script lang="ts">
    import Loader from "lucide-svelte/icons/loader";
    import Pill from "lucide-svelte/icons/pill";
    import Inbox from "lucide-svelte/icons/inbox";
    import History from "lucide-svelte/icons/history";
    import ShoppingCart from "lucide-svelte/icons/shopping-cart";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    
    // Menu items.
    const items = [
     {
      title: "Medicines",
      url: "/",
      icon: Pill,
     },
     {
      title: "Cart",
      url: "/cart",
      icon: ShoppingCart,
     },
     {
      title: "Pending Pickups",
      url: "/pending-pickup",
      icon: Loader,
     },
     {
      title: "Order History",
      url: "/order-history",
      icon: History,
     }
    ];
   </script>
    
   <Sidebar.Root>
    <Sidebar.Content>
     <Sidebar.Group>
      <Sidebar.GroupLabel>MEDIQUICK</Sidebar.GroupLabel>
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