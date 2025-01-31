<script lang="ts">
	import { onMount } from 'svelte';
	import {
	  doc,
	  getDoc,
	  query,
	  collection,
	  getDocs,
	  deleteDoc,
	  setDoc,
	  where
	} from 'firebase/firestore';
	import { auth, db } from '$lib/firebase'; // Firebase Auth and Firestore
	import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth state
	import { goto } from '$app/navigation'; // For navigation
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import Separator from '$lib/components/ui/separator/separator.svelte';
  
	let isAuthorized = false;
	let pickupItems: any[] = [];
	let errorMessage = '';
	let cancelReason = '';
  
	// Fetch pickup items and check user authorization
	onMount(() => {
	  onAuthStateChanged(auth, async (user) => {
		if (!user) {
		  console.log('No user is authenticated. Redirecting to homepage.');
		  window.location.href = '/'; // Redirect to homepage
		  return;
		}
  
		try {
		  const userDocRef = doc(db, 'users', user.uid);
		  const userDoc = await getDoc(userDocRef);
  
		  if (userDoc.exists()) {
			const userData = userDoc.data();
  
			if (userData?.role !== 'admin') {
			  console.log('User is not an admin. Redirecting to homepage.');
			  window.location.href = '/'; // Redirect to homepage or other page
			} else {
			  console.log('User is authenticated as an admin.');
			  isAuthorized = true; // Allow access to admin content
			  fetchPickupItems(); // Fetch pickup items after authorization
			}
		  } else {
			console.error('User document not found in Firestore.');
			window.location.href = '/login'; // Redirect to login if user doc not found
		  }
		} catch (error) {
		  console.error('Error fetching user role:', error);
		  errorMessage = 'An error occurred while checking user role.';
		  window.location.href = '/'; // Fallback to homepage if error occurs
		}
	  });
	});
  
	// Fetch pickup items from Firestore
	const fetchPickupItems = async () => {
	  try {
		const q = query(collection(db, 'pickup'));
		const querySnapshot = await getDocs(q);
		pickupItems = querySnapshot.docs.map((doc) => ({
		  id: doc.id,
		  ...doc.data()
		}));
  
		// Group orders by userId
		pickupItems = groupOrdersByUser(pickupItems);
	  } catch (error) {
		console.error('Error fetching pickup items:', error);
	  }
	};
  
	// Group orders by userId
	const groupOrdersByUser = (items: any[]) => {
	  const groupedOrders: { [key: string]: any[] } = {};
  
	  items.forEach(item => {
		if (!groupedOrders[item.userId]) {
		  groupedOrders[item.userId] = [];
		}
		groupedOrders[item.userId].push(item);
	  });
  
	  return Object.entries(groupedOrders).map(([userId, orders]) => ({
		userId,
		orders,
		fullName: orders[0]?.fullName, // Assuming fullName is the same for all orders from a user
	  }));
	};
  
	// Mark all orders for a user as completed
	const markAllAsCompleted = async (userId: string) => {
	  try {
		const userOrders = pickupItems.find((user) => user.userId === userId)?.orders;
		if (userOrders) {
		  for (let order of userOrders) {
			const orderRef = doc(db, 'pickup', order.id);
			const orderSnapshot = await getDoc(orderRef);
  
			if (orderSnapshot.exists()) {
			  const orderData = orderSnapshot.data();
			  const orderHistoryRef = doc(db, 'orderhistory', order.id);
  
			  await setDoc(orderHistoryRef, {
				...orderData,
				status: 'completed',
				completedAt: new Date()
			  });
  
			  await deleteDoc(orderRef); // Delete from pickup collection
			}
		  }
		  fetchPickupItems(); // Refresh list after marking orders as completed
		}
	  } catch (error) {
		console.error('Error marking orders as completed:', error);
	  }
	};
  
	// Cancel all orders for a user
	const cancelAllOrders = async (userId: string) => {
	  try {
		const userOrders = pickupItems.find((user) => user.userId === userId)?.orders;
		if (userOrders) {
		  for (let order of userOrders) {
			const orderRef = doc(db, 'pickup', order.id);
			const orderSnapshot = await getDoc(orderRef);
  
			if (orderSnapshot.exists()) {
			  const orderData = orderSnapshot.data();
			  const orderHistoryRef = doc(db, 'orderhistory', order.id);
  
			  await setDoc(orderHistoryRef, {
				...orderData,
				status: 'cancelled',
				cancelledAt: new Date()
			  });
  
			  await deleteDoc(orderRef); // Delete from pickup collection
			}
		  }
		  fetchPickupItems(); // Refresh list after cancelling orders
		}
	  } catch (error) {
		console.error('Error cancelling orders:', error);
	  }
	};
  </script>
  
  {#if isAuthorized}
	<div class="admin-dashboard">
	  <h1>Current Pickup Orders</h1>
  
	  {#if pickupItems.length === 0}
		<p>No pickup orders available.</p>
	  {:else}
		<div class="pickup-items flex flex-row gap-2">
		  {#each pickupItems as user}
			<Card.Root class="pickup-item">
			  <Card.Content>
				<div class="flex flex-row justify-between">
				  <div class="flex flex-col">
					<span>Order #351</span>
					<span class="font-light">{user.fullName}</span>
					<span>Pickup Time: ASAP</span>
				  </div>
  
				  <Avatar.Root>
					<Avatar.Image src="https://avatar.iran.liara.run/public/63" alt="@shadcn" />
					<Avatar.Fallback>CN</Avatar.Fallback>
				  </Avatar.Root>
				</div>
				<ScrollArea class="h-auto">
				  {#each user.orders as order}
					<div class="flex flex-row">
					  <div>
						<img src="/placeholder.png" alt="Placeholder" class="w-20" />
					  </div>
					  <div class="flex flex-1 flex-col p-2">
						<span class="font-medium">{order.name}</span>
						<div class="flex justify-between text-sm">
						  <span>₱{order.price} </span>
						  <span>Qty: {order.quantity}</span>
						</div>
					  </div>
					</div>
				  {/each}
				</ScrollArea>
				<Separator class="mb-2" />
				<div class="flex flex-row">
				  <div class="flex flex-1 flex-col">
					<span>Total items: {user.orders.length} items</span>
					<span>Total price: ₱{user.orders.reduce((total: number, order: { price: number; quantity: number; }) => total + order.price * order.quantity, 0)}</span>
				  </div>
				  <Button
					onclick={() => markAllAsCompleted(user.userId)}
					variant="outline"
					class="text-green-500 hover:text-green-500"><Check /></Button>
				  <Button
					onclick={() => cancelAllOrders(user.userId)}
					variant="outline"
					class="text-red-500 hover:text-red-500"><X /></Button>
				</div>
			  </Card.Content>
			</Card.Root>
		  {/each}
		</div>
	  {/if}
	</div>
  {:else if errorMessage}
	<p style="color: red;">{errorMessage}</p>
	<!-- Display error message -->
  {/if}
  