<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { writable } from 'svelte/store';

	import {
		collection,
		getDocs,
		addDoc,
		updateDoc,
		doc,
		getDoc,
		deleteDoc
	} from 'firebase/firestore';
	import { db, auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';

	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';

	import Star from 'lucide-svelte/icons/star';

	let medicine: any = null;
	let quantity = 1;
	let medicines: any[] = [];
	let currentId: string;
	let user = page.data.user;
	let loading: Record<string, boolean> = {};
	let postAnonymously = false;

	let selectedRating = 0; // For star rating selection
	let reviewText = ''; // For review input

	let userReview: any = null;
	let reviews: any[] = [];
	let averageRating: number = 0.0;
	let isReviewDialogOpen = false;

	let totalReviews = reviews.length; // Make sure this is updated after fetching reviews
	let loadingState = false;

	const showLoginDialog = writable(false);
	const loginDialogMessage = writable('');

	const fetchReviews = async () => {
		try {
			const reviewsSnapshot = await getDocs(collection(db, 'medicines', medicine.id, 'reviews'));
			reviews = reviewsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

			totalReviews = reviews.length; // Move this here!

			// Check if the current user has a review
			userReview = reviews.find((review) => review.userId === user?.uid);

			// Calculate average rating and rating distribution
			if (reviews.length > 0) {
				const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
				averageRating = parseFloat((totalRating / reviews.length).toFixed(1));

				// Update ratings array
				ratings = [5, 4, 3, 2, 1].map((star) => ({
					stars: star,
					count: reviews.filter((review) => review.rating === star).length
				}));
			} else {
				averageRating = 0.0;
				ratings = [5, 4, 3, 2, 1].map((star) => ({ stars: star, count: 0 }));
			}
		} catch (error) {
			console.error('Error fetching reviews:', error);
		}
	};

	function showLogin(message: string) {
		loginDialogMessage.set(message);
		showLoginDialog.set(true);
	}

	let ratings = [
		{ stars: 5, count: 30 },
		{ stars: 4, count: 0 },
		{ stars: 3, count: 1 },
		{ stars: 2, count: 0 },
		{ stars: 1, count: 1 }
	];

	const updateRatings = () => {
		ratings = [5, 4, 3, 2, 1].map((star) => ({
			stars: star,
			count: reviews.filter((review) => review.rating === star).length
		}));
	};

	const fetchMedicine = async () => {
		currentId = page.params.id;

		if (!currentId) {
			console.error('No medicine id found in the URL');
			return;
		}

		try {
			const docRef = doc(db, 'medicines', currentId);
			const docSnap = await getDoc(docRef);

			if (docSnap.exists()) {
				medicine = { ...docSnap.data(), id: docSnap.id }; // Add id here
				await fetchReviews();
			} else {
				console.log('No such document!');
			}

			const querySnapshot = await getDocs(collection(db, 'medicines'));
			medicines = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				name: doc.data().name,
				price: doc.data().price,
				imageUrl: doc.data().imageUrl || '/placeholder.png',
				brand: doc.data().brand || 'Unknown Brand',
				generic: doc.data().generic || 'Unknown Generic',
				dosage: doc.data().dosage || 'No Dosage Info',
				form: doc.data().form || 'No Form Info'
			}));
		} catch (error) {
			console.error('Error fetching medicine details:', error);
		}
	};

	afterUpdate(() => {
		if (page.params.id !== currentId) {
			fetchMedicine();
		}
	});

	onMount(() => {
		fetchMedicine();
		onAuthStateChanged(auth, (currentUser) => {
			user = currentUser ? currentUser : null;
		});
	});

	const goToMedicine = (id: string) => {
		goto(`/medicine/${id}`);
	};

	const addToCart = async (medicine: any, quantity: number) => {
		if (!user) {
			showLogin('You need to be logged in to add to cart.');
			return;
		}

		// Check if required fields are present
		if (!medicine || !medicine.id || !medicine.name || !medicine.price || !medicine.imageUrl) {
			console.error('Invalid medicine data:', medicine);
			toast.error('Failed to add item to cart. Invalid medicine data.');
			return;
		}

		loading = { ...loading, [medicine.id]: true }; // Show loading state

		try {
			// Fetch medicine stock
			const medicineRef = doc(db, 'medicines', medicine.id);
			const medicineSnapshot = await getDoc(medicineRef);

			if (!medicineSnapshot.exists()) {
				console.error('Medicine not found');
				return;
			}

			const stock = medicineSnapshot.data().stock || 0;

			if (stock === 0) {
				// If stock is 0 or not enough stock, show a toast and return
				toast.error(`${medicine.name} is out of stock.`);
				return;
			}

			const userDocRef = doc(db, 'users', user.uid);
			const userDocSnap = await getDoc(userDocRef);

			if (!userDocSnap.exists()) {
				console.error('User document not found');
				return;
			}

			const fullName = userDocSnap.data().fullName;
			const querySnapshot = await getDocs(collection(db, 'cart'));
			const existingItem = querySnapshot.docs.find(
				(doc) => doc.data().medicineId === medicine.id && doc.data().userId === user.uid
			);

			if (existingItem) {
				await updateDoc(doc(db, 'cart', existingItem.id), {
					quantity: existingItem.data().quantity + quantity // Add the correct quantity
				});
			} else {
				await addDoc(collection(db, 'cart'), {
					userId: user.uid,
					fullName: fullName,
					medicineId: medicine.id,
					name: medicine.name,
					price: medicine.price,
					quantity: quantity, // Add the specified quantity
					imageUrl: medicine.imageUrl || '/placeholder.png',
					createdAt: new Date().toISOString()
				});
			}

			toast.success(`${medicine.name} added to cart!`);
		} catch (error) {
			console.error('Error adding to cart:', error);
			toast.error('Failed to add item to cart.');
		} finally {
			loading = { ...loading, [medicine.id]: false }; // Reset loading state
		}
	};

	const submitReview = async () => {
		if (!user) {
			toast.error('You must be logged in to submit a review.');
			return;
		}

		if (!selectedRating || !reviewText.trim()) {
			toast.error('Please provide a rating and a review.');
			return;
		}

		loadingState = true; // Set loading state

		try {
			// Fetch user's fullName from 'users' collection
			const userDocRef = doc(db, 'users', user.uid);
			const userDocSnap = await getDoc(userDocRef);

			if (!userDocSnap.exists()) {
				toast.error('User information not found.');
				return;
			}

			const { fullName } = userDocSnap.data();

			const reviewRef = collection(db, 'medicines', medicine.id, 'reviews');
			const existingReviewSnapshot = await getDocs(reviewRef);
			const userReviewDoc = existingReviewSnapshot.docs.find(
				(doc) => doc.data().userId === user.uid
			);

			const reviewData = {
				userId: user.uid,
				fullName: postAnonymously ? 'Anonymous' : fullName, // Use fullName if not anonymous
				rating: selectedRating,
				review: reviewText,
				createdAt: new Date().toISOString(),
				anonymous: postAnonymously
			};

			if (userReviewDoc) {
				await updateDoc(doc(db, 'medicines', medicine.id, 'reviews', userReviewDoc.id), {
					...reviewData,
					updatedAt: new Date().toISOString()
				});
				toast.success('Review updated successfully!');
			} else {
				await addDoc(reviewRef, reviewData);
				toast.success('Review submitted successfully!');
			}

			// Reset form
			selectedRating = 0;
			reviewText = '';
			postAnonymously = false;

			// Refresh reviews
			await fetchReviews();
			updateRatings();
			isReviewDialogOpen = false;
		} catch (error) {
			console.error('Error submitting review:', error);
			toast.error('Failed to submit review.');
		} finally {
			loadingState = false; // Reset loading state
		}
	};

	let isDeleting = writable(false);

	const deleteReview = async () => {
		if (!userReview) {
			toast.error('No review to delete.');
			return;
		}

		isDeleting.set(true); // Start loading state

		try {
			await deleteDoc(doc(db, 'medicines', medicine.id, 'reviews', userReview.id));
			toast.success('Review deleted successfully!');

			// Refresh reviews after deletion
			userReview = null;
			await fetchReviews();
			updateRatings();
			isReviewDialogOpen = false;
		} catch (error) {
			console.error('Error deleting review:', error);
			toast.error('Failed to delete review.');
		} finally {
			isDeleting.set(false); // End loading state
		}
	};
</script>

{#if medicine}
	<div class="mx-auto max-w-80 sm:max-w-full md:max-w-full">
		<div class="flex max-w-full flex-col gap-6 sm:flex-row">
			<Card.Root class="w-full rounded-lg border-none shadow-none sm:flex-1">
				<Card.Content class="flex flex-col items-center justify-center bg-primary-foreground p-0">
					<img
						src={medicine.imageUrl || '/placeholder.png'}
						alt={medicine.name}
						class="w-full max-w-[250px] rounded-lg object-contain"
					/>

					<div class="hidden w-full rounded-lg p-6 sm:block">
						<h2 class="text-2xl font-semibold text-gray-800">Review</h2>

						<div class="my-4 flex flex-row items-center justify-between">
							<!-- Average Rating Display -->
							<div class="flex flex-col items-center space-y-2">
								<span class="text-5xl font-extrabold text-gray-800">{averageRating.toFixed(1)}</span
								>
								<div class="flex">
									{#each Array(5) as _, i}
										<Star
											size={24}
											class={i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}
										/>
									{/each}
								</div>
								<span class="text-sm text-gray-500">{totalReviews} Reviews</span>
							</div>

							<!-- Rating Distribution Bars -->
							<div class="mt-2">
								{#each ratings as rating}
									<div class="flex items-center">
										<span class="text-sm font-medium">{rating.stars} ★</span>
										<div class="ml-2 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
											<div
												class="h-full bg-yellow-400"
												style="width: {totalReviews > 0 ? (rating.count / totalReviews) * 100 : 0}%"
											></div>
										</div>
										<span class="ml-2 text-sm">{rating.count}</span>
									</div>
								{/each}
							</div>
						</div>

						<Separator class="my-6 border-t border-gray-300" />

						<!-- Total Reviews Display -->
						<div class="mb-4 flex items-center justify-between">
							<p class="text-lg font-semibold text-gray-800">
								{reviews.length} <span class="text-sm font-light text-gray-500">Reviews</span>
							</p>

							<!-- Review Dialog -->
							<Dialog.Root bind:open={isReviewDialogOpen}>
								<Dialog.Trigger
									class={buttonVariants({ variant: 'default' })}
									onclick={(event) => {
										if (!user) {
											showLogin('You need to be logged in to be able to review.'); // Show login dialog if not logged in
											event.preventDefault(); // Prevents opening the review dialog
											event.stopPropagation(); // Stops event from bubbling up
											return;
										}

										if (userReview) {
											selectedRating = userReview.rating;
											reviewText = userReview.review;
										} else {
											selectedRating = 0;
											reviewText = '';
										}
									}}
								>
									{userReview ? 'Edit Review' : 'Write Review'}
								</Dialog.Trigger>

								<Dialog.Content class="sm:max-w-[425px]">
									<Dialog.Header>
										<Dialog.Title>📝 Write a Review</Dialog.Title>
										<Dialog.Description
											>Share your thoughts about {medicine.name}</Dialog.Description
										>
									</Dialog.Header>

									<!-- Review Form -->
									<div class="grid gap-4 py-4">
										<!-- Rating Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="rating" class="text-right">Rating</Label>
											<div class="col-span-3 flex space-x-1">
												{#each Array(5) as _, i}
													<Star
														size={24}
														class="cursor-pointer transition-colors duration-200 {i < selectedRating
															? 'text-yellow-400'
															: 'text-gray-300'}"
														onclick={() => (selectedRating = i + 1)}
													/>
												{/each}
											</div>
										</div>

										<!-- Review Text Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="review" class="text-right">Review</Label>
											<Textarea
												id="review"
												bind:value={reviewText}
												class="col-span-3 rounded border p-2"
												placeholder="Write your review here..."
											></Textarea>
										</div>

										<!-- Anonymous Checkbox Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="anonymous" class="text-right">Anonymous</Label>
											<input
												id="anonymous"
												type="checkbox"
												bind:checked={postAnonymously}
												class="col-span-3 h-4 w-4"
											/>
										</div>
									</div>

									<Dialog.Footer>
										<Button
											onclick={submitReview}
											disabled={!selectedRating || !reviewText.trim() || loadingState}
										>
											{#if loadingState}
												Submitting...
											{/if}
											{#if !loadingState}
												{userReview ? 'Update Review' : 'Submit Review'}
											{/if}
										</Button>

										{#if userReview}
											<AlertDialog.Root>
												<AlertDialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
													Delete Review
												</AlertDialog.Trigger>

												<AlertDialog.Content>
													<AlertDialog.Header>
														<AlertDialog.Title
															>Are you sure you want to delete your review?</AlertDialog.Title
														>
														<AlertDialog.Description>
															This action cannot be undone. Your review will be permanently removed.
														</AlertDialog.Description>
													</AlertDialog.Header>

													<AlertDialog.Footer>
														<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })}>
															Cancel
														</AlertDialog.Cancel>
														<AlertDialog.Action
															class={buttonVariants({ variant: 'destructive' })}
															onclick={deleteReview}
															disabled={$isDeleting}
														>
															{#if $isDeleting}
																Deleting...
															{:else}
																Delete
															{/if}
														</AlertDialog.Action>
													</AlertDialog.Footer>
												</AlertDialog.Content>
											</AlertDialog.Root>
										{/if}
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
						</div>

						<!-- Review List -->
						<div class="mt-6">
							<ScrollArea class="h-48 w-full">
								{#if reviews.length > 0}
									{#each reviews as review}
										<div class="mb-4 rounded-lg border p-4 shadow-md">
											<div class="flex items-center space-x-2">
												<p class="font-semibold">
													{review.anonymous ? 'Anonymous' : review.fullName}
												</p>
												<div class="flex">
													{#each Array(5) as _, i}
														<span class={i < review.rating ? 'text-yellow-400' : 'text-gray-400'}>
															★
														</span>
													{/each}
												</div>
											</div>
											<p class="mt-2 text-gray-700">{review.review}</p>
											<p class="text-sm text-gray-500">
												{new Date(review.createdAt).toLocaleDateString()}
											</p>

											{#if review.userId === user?.uid}
												<AlertDialog.Root>
													<AlertDialog.Trigger
														class={`mt-2 h-6 w-14 text-xs ${buttonVariants({ variant: 'destructive' })}`}
													>
														Delete
													</AlertDialog.Trigger>

													<AlertDialog.Content>
														<AlertDialog.Header>
															<AlertDialog.Title
																>Are you sure you want to delete your review?</AlertDialog.Title
															>
															<AlertDialog.Description>
																This action cannot be undone. Your review will be permanently
																removed.
															</AlertDialog.Description>
														</AlertDialog.Header>

														<AlertDialog.Footer>
															<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })}>
																Cancel
															</AlertDialog.Cancel>
															<AlertDialog.Action
																class={buttonVariants({ variant: 'destructive' })}
																onclick={deleteReview}
																disabled={$isDeleting}
															>
																{#if $isDeleting}
																	Deleting...
																{:else}
																	Delete
																{/if}
															</AlertDialog.Action>
														</AlertDialog.Footer>
													</AlertDialog.Content>
												</AlertDialog.Root>
											{/if}
										</div>
									{/each}
								{:else}
									<p class="text-gray-500">No reviews yet. Be the first to write one!</p>
								{/if}
							</ScrollArea>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="w-full rounded-lg border-none bg-primary-foreground shadow-none sm:flex-1">
				<Card.Content class="mx-auto flex flex-col items-start justify-start space-y-4 p-6">
					<span class="text-3xl font-medium">{medicine.name}</span>

					<!-- Star Rating -->
					<!-- <div class="flex items-center gap-2">
						{#each Array(5) as _, i}
							<Star
								size={24}
								class={i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}
							/>
						{/each}
						<span class="text-sm text-gray-500">({totalReviews})</span>
					</div> -->

					<span class="text-2xl font-medium ">₱{medicine.price}</span>
					<span class="text-sm text-gray-500">Stock: {medicine.stock}</span>

					<Separator class="my-4" />

					<span class="text-base font-medium">Quantity</span>
					<div class="flex gap-4 justify-between w-full">
						<Input
							type="number"
							bind:value={quantity}
							class="w-24 rounded-lg border p-2"
							min="1"
							max={medicine?.stock || 0}
							disabled={medicine?.stock === 0}
						/>
						<Button
							class="flex-1 bg-orange-400 px-4 py-2 text-white hover:bg-orange-300 "
							onclick={() => addToCart(medicine, quantity)}
							disabled={loading[medicine.id]}
						>
							{#if loading[medicine.id]}
								Adding...
							{:else}
								Add To Cart
							{/if}
						</Button>
					</div>

					<span class="mt-4 text-lg font-medium">About the Product</span>
					<p>{medicine.description || 'No description available'}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root class="block sm:hidden shadow-none border-none">
				<Card.Content class="mx-auto flex flex-col items-center justify-center p-0">
					<!-- Mobile-only content -->
					<div class="w-full rounded-lg bg-primary-foreground p-6">
						<h2 class="text-2xl font-semibold text-gray-800">Review</h2>

						<div class="my-4 flex-col">
							<!-- Average Rating Display -->
							<div class="flex flex-col space-y-2">
								<span class="text-5xl font-extrabold text-gray-800">{averageRating.toFixed(1)}</span
								>
								<div class="flex">
									{#each Array(5) as _, i}
										<Star
											size={24}
											class={i < Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}
										/>
									{/each}
								</div>
								<span class="text-sm text-gray-500">{totalReviews} Reviews</span>
							</div>

							<!-- Rating Distribution Bars -->
							<div class="mt-2">
								{#each ratings as rating}
									<div class="flex items-center">
										<span class="text-sm font-medium">{rating.stars} ★</span>
										<div class="ml-2 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
											<div
												class="h-full bg-yellow-400"
												style="width: {totalReviews > 0 ? (rating.count / totalReviews) * 100 : 0}%"
											></div>
										</div>
										<span class="ml-2 text-sm">{rating.count}</span>
									</div>
								{/each}
							</div>
						</div>

						<Separator class="my-6 border-t border-gray-300" />

						<!-- Total Reviews Display -->
						<div class="mb-4 flex items-center justify-between">
							<p class="text-lg font-semibold text-gray-800">
								{reviews.length} <span class="text-sm font-light text-gray-500">Reviews</span>
							</p>

							<!-- Review Dialog -->
							<Dialog.Root bind:open={isReviewDialogOpen}>
								<Dialog.Trigger
									class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
									onclick={(event) => {
										if (!user) {
											showLogin('You need to be logged in to be able to review.'); // Show login dialog if not logged in
											event.preventDefault(); // Prevents opening the review dialog
											event.stopPropagation(); // Stops event from bubbling up
											return;
										}

										if (userReview) {
											selectedRating = userReview.rating;
											reviewText = userReview.review;
										} else {
											selectedRating = 0;
											reviewText = '';
										}
									}}
								>
									{userReview ? 'Edit Review' : 'Write Review'}
								</Dialog.Trigger>

								<Dialog.Content class="sm:max-w-[425px]">
									<Dialog.Header>
										<Dialog.Title>📝 Write a Review</Dialog.Title>
										<Dialog.Description
											>Share your thoughts about {medicine.name}</Dialog.Description
										>
									</Dialog.Header>

									<!-- Review Form -->
									<div class="grid gap-4 py-4">
										<!-- Rating Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="rating" class="text-right">Rating</Label>
											<div class="col-span-3 flex space-x-1">
												{#each Array(5) as _, i}
													<Star
														size={24}
														class="cursor-pointer transition-colors duration-200 {i < selectedRating
															? 'text-yellow-400'
															: 'text-gray-300'}"
														onclick={() => (selectedRating = i + 1)}
													/>
												{/each}
											</div>
										</div>

										<!-- Review Text Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="review" class="text-right">Review</Label>
											<Textarea
												id="review"
												bind:value={reviewText}
												class="col-span-3 rounded border p-2"
												placeholder="Write your review here..."
											></Textarea>
										</div>

										<!-- Anonymous Checkbox Section -->
										<div class="grid grid-cols-4 items-center gap-4">
											<Label for="anonymous" class="text-right">Anonymous</Label>
											<input
												id="anonymous"
												type="checkbox"
												bind:checked={postAnonymously}
												class="col-span-3 h-4 w-4"
											/>
										</div>
									</div>

									<Dialog.Footer>
										<Button
											onclick={submitReview}
											disabled={!selectedRating || !reviewText.trim() || loadingState}
										>
											{#if loadingState}
												Submitting...
											{/if}
											{#if !loadingState}
												{userReview ? 'Update Review' : 'Submit Review'}
											{/if}
										</Button>

										{#if userReview}
											<AlertDialog.Root>
												<AlertDialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
													Delete Review
												</AlertDialog.Trigger>

												<AlertDialog.Content>
													<AlertDialog.Header>
														<AlertDialog.Title
															>Are you sure you want to delete your review?</AlertDialog.Title
														>
														<AlertDialog.Description>
															This action cannot be undone. Your review will be permanently removed.
														</AlertDialog.Description>
													</AlertDialog.Header>

													<AlertDialog.Footer>
														<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })}>
															Cancel
														</AlertDialog.Cancel>
														<AlertDialog.Action
															class={buttonVariants({ variant: 'destructive' })}
															onclick={deleteReview}
															disabled={$isDeleting}
														>
															{#if $isDeleting}
																Deleting...
															{:else}
																Delete
															{/if}
														</AlertDialog.Action>
													</AlertDialog.Footer>
												</AlertDialog.Content>
											</AlertDialog.Root>
										{/if}
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
						</div>

						<!-- Review List -->
						<div class="mt-6">
							<ScrollArea class="h-48 w-full">
								{#if reviews.length > 0}
									{#each reviews as review}
										<div class="mb-4 rounded-lg border p-4 shadow-md">
											<div class="flex items-center space-x-2">
												<p class="font-semibold">
													{review.anonymous ? 'Anonymous' : review.fullName}
												</p>
												<div class="flex">
													{#each Array(5) as _, i}
														<span class={i < review.rating ? 'text-yellow-400' : 'text-gray-400'}>
															★
														</span>
													{/each}
												</div>
											</div>
											<p class="mt-2 text-gray-700">{review.review}</p>
											<p class="text-sm text-gray-500">
												{new Date(review.createdAt).toLocaleDateString()}
											</p>

											{#if review.userId === user?.uid}
												<AlertDialog.Root>
													<AlertDialog.Trigger
														class={`mt-2 h-6 w-14 text-xs ${buttonVariants({ variant: 'destructive' })}`}
													>
														Delete
													</AlertDialog.Trigger>

													<AlertDialog.Content>
														<AlertDialog.Header>
															<AlertDialog.Title
																>Are you sure you want to delete your review?</AlertDialog.Title
															>
															<AlertDialog.Description>
																This action cannot be undone. Your review will be permanently
																removed.
															</AlertDialog.Description>
														</AlertDialog.Header>

														<AlertDialog.Footer>
															<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })}>
																Cancel
															</AlertDialog.Cancel>
															<AlertDialog.Action
																class={buttonVariants({ variant: 'destructive' })}
																onclick={deleteReview}
																disabled={$isDeleting}
															>
																{#if $isDeleting}
																	Deleting...
																{:else}
																	Delete
																{/if}
															</AlertDialog.Action>
														</AlertDialog.Footer>
													</AlertDialog.Content>
												</AlertDialog.Root>
											{/if}
										</div>
									{/each}
								{:else}
									<p class="text-gray-500">No reviews yet. Be the first to write one!</p>
								{/if}
							</ScrollArea>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root class="mt-2 border-none bg-transparent shadow-none border-t-2 border-t-black">
			<Card.Content><Card.Title>You may also like</Card.Title></Card.Content>
		</Card.Root>
		<div class="mt-6 flex w-full justify-center">
			<Carousel.Root class="w-full bg-primary-foreground">
				<Carousel.Content class="-ml-1">
					{#each medicines.filter((m) => m.id !== currentId) as medicine, i (i)}
						<Carousel.Item
							class="basis-full sm:basis-1/2 md:basis-1/4"
							onclick={() => goToMedicine(medicine.id)}
						>
							<div>
								<Card.Root>
									<Card.Content
										class="flex aspect-square items-center justify-center p-4 hover:cursor-pointer hover:bg-primary-foreground"
									>
										<img
											src={medicine.imageUrl}
											alt="Medicine"
											class="w-48 rounded-md object-contain sm:h-56 sm:w-56 md:h-64 md:w-64"
										/>
									</Card.Content>
									<Card.Footer class="flex flex-col items-start space-y-2 p-4">
										<div class="min-h-[60px] flex-grow">
											<span class="text-sm font-normal">
												<span class="font-semibold uppercase">{medicine.brand}</span>
												{medicine.generic}
												{medicine.dosage}
												{medicine.form}
											</span>
										</div>
										<span class="text-lg font-medium">₱{medicine.price}</span>
										<Button
											class="w-full py-2 text-white bg-orange-400 hover:bg-orange-300"
											onclick={(e) => {
												e.stopPropagation();
												addToCart(medicine, 1);
											}}
											disabled={loading[medicine.id]}
										>
											{#if loading[medicine.id]}
												Adding...
											{:else}
											Add to Cart
											{/if}
										</Button>
									</Card.Footer>
								</Card.Root>
							</div>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous />
				<Carousel.Next />
			</Carousel.Root>
		</div>
	</div>
{/if}

{#if $showLoginDialog}
	<Dialog.Root bind:open={$showLoginDialog}>
		<Dialog.Content class="sm:max-w-[400px]">
			<Dialog.Header>
				<Dialog.Title>Login Required</Dialog.Title>
				<Dialog.Description>{$loginDialogMessage}</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer class="flex justify-end gap-4">
				<Button variant="outline" onclick={() => showLoginDialog.set(false)}>Cancel</Button>
				<Button onclick={() => goto('/login')}>Login</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
