<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { categoriesStore } from '$lib/stores/categories';

	import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import CirclePlus from 'lucide-svelte/icons/circle-plus';

	let categories = $state<Array<{ value: string; label: string }>>([]); // Store categories from Firestore
	let newCategory = $state({ value: '', label: '' });
	let selectedCategory = $state<{ value: string; label: string } | null>(null);

	let isLoading = $state(false); // Loading state

	// Fetch categories from Firestore on mount
	onMount(async () => {
		try {
			// Get categories from Firestore collection
			const querySnapshot = await getDocs(collection(db, 'categories'));
			// Map Firestore documents to category objects with both 'value' and 'label'
			categories = querySnapshot.docs.map((doc) => ({
				value: doc.id, // Use the document ID as 'value'
				label: doc.data().label // Assuming 'label' is stored in Firestore document
			}));
		} catch (error) {
			console.error('Error fetching categories:', error);
		}
	});

	const addCategory = async () => {
		if (isLoading) return; // Prevent multiple submissions

		// Trim whitespace and validate input
		newCategory.label = newCategory.label.trim();
		if (!newCategory.label) {
			toast.error('Category name cannot be empty.');
			return;
		}

		isLoading = true; // Start loading
		newCategory.value = newCategory.label.toLowerCase().replace(/ /g, '-');

		try {
			const docRef = doc(collection(db, 'categories'), newCategory.value);
			await setDoc(docRef, { label: newCategory.label, value: newCategory.value });

			const addedCategoryLabel = newCategory.label;

			categories = [...categories, { value: newCategory.value, label: newCategory.label }];

			toast.success(`${addedCategoryLabel} has been added`);

			const addedCategory = { value: newCategory.value, label: newCategory.label };

			categoriesStore.update((categories) => [...categories, addedCategory]);

			// Reset after adding
			newCategory = { value: '', label: '' };
		} catch (error) {
			console.error('Error adding category:', error);
			toast.error('Failed to add category. Please try again.');
		} finally {
			isLoading = false; // Stop loading
		}
	};

	let isEditDialogOpen = $state(false); // Dialog visibility state

	const editCategory = async (category: { value: string; label: string }) => {
		const updatedLabel = category.label.trim();
		if (!updatedLabel) {
			toast.error('Category name cannot be empty.');
			return;
		}

		if (isLoading) return; // Prevent multiple submissions
		isLoading = true; // Start loading

		const newCategoryValue = updatedLabel.toLowerCase().replace(/ /g, '-');

		try {
			const oldCategoryRef = doc(db, 'categories', category.value);

			// Create a new category document with the new value and label
			const newCategoryRef = doc(db, 'categories', newCategoryValue);
			await setDoc(newCategoryRef, { label: updatedLabel, value: newCategoryValue });

			// Check if the new category was successfully created by fetching it
			const newCategoryDoc = await getDoc(newCategoryRef);
			if (newCategoryDoc.exists()) {
				// Delete the old category document after confirming the new one is created
				await deleteDoc(oldCategoryRef);

				// Update the state to reflect the changes
				categories = categories.map((cat) =>
					cat.value === category.value ? { value: newCategoryValue, label: updatedLabel } : cat
				);

				toast.success('Category updated successfully.');

				// After editing a category, update the store
				categoriesStore.update((categories) =>
					categories.map((cat) =>
						cat.value === category.value ? { value: newCategoryValue, label: updatedLabel } : cat
					)
				);
			} else {
				console.error('Error: New category not created.');
				toast.error('Failed to update category. Please try again.');
			}
		} catch (error) {
			console.error('Error editing category:', error);
			toast.error('Failed to update category. Please try again.');
		} finally {
			isLoading = false; // Stop loading
			isEditDialogOpen = false; // Close the dialog
		}
	};

	let isDeleteDialogOpen = $state(false); // Controls the alert dialog

	const deleteCategory = async (category: { value: string; label: string }) => {
		if (isLoading) return; // Prevent multiple deletions

		isLoading = true; // Start loading

		try {
			const categoryRef = doc(db, 'categories', category.value);
			await deleteDoc(categoryRef);

			categories = categories.filter((cat) => cat.value !== category.value);

			toast.success(`"${category.label}" has been deleted`);

			// After deleting a category, update the store
			categoriesStore.update((categories) =>
				categories.filter((cat) => cat.value !== category.value)
			);
		} catch (error) {
			console.error('Error deleting category:', error);
			toast.error('Failed to delete category. Please try again.');
		} finally {
			isLoading = false; // Stop loading
			isDeleteDialogOpen = false; // Close AlertDialog
		}
	};
</script>

<div class="flex flex-col">
	<ScrollArea class="h-72 border">
		{#each categories as category (category.value)}
			<div class="flex flex-row hover:bg-primary-foreground">
				<span class="flex-1 bg-transparent p-2 text-sm hover:bg-primary-foreground"
					>{category.label}</span
				>
				<AlertDialog.Root bind:open={isDeleteDialogOpen}>
					<AlertDialog.Trigger
						class={buttonVariants({ variant: 'ghost' })}
						onclick={() => {
							selectedCategory = category;
							isDeleteDialogOpen = true;
						}}
					>
						<Trash2 />
					</AlertDialog.Trigger>

					<AlertDialog.Content class="max-w-sm">
						<AlertDialog.Header>
							<AlertDialog.Title>Are you sure?</AlertDialog.Title>
							<AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel
								onclick={() => {
									isDeleteDialogOpen = true; // Set the dialog state separately
								}}
							>
								Cancel
							</AlertDialog.Cancel>

							<AlertDialog.Action
								onclick={() => {
									if (selectedCategory) {
										deleteCategory(selectedCategory);
									}
								}}
								disabled={isLoading}
							>
								{#if isLoading}
									<span
										class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
									></span>
								{:else}
									Delete
								{/if}
							</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
				<AlertDialog.Root bind:open={isEditDialogOpen}>
					<AlertDialog.Trigger
						class={buttonVariants({ variant: 'ghost' })}
						onclick={() => {
							selectedCategory = { ...category };
							isEditDialogOpen = true;
						}}
					>
						<Pencil />
					</AlertDialog.Trigger>
					{#if selectedCategory}
						<AlertDialog.Content class="max-w-sm">
							<AlertDialog.Header>
								<AlertDialog.Title>Edit Category</AlertDialog.Title>
								<AlertDialog.Description>Change the name of the category.</AlertDialog.Description>
							</AlertDialog.Header>

							<!-- Bind the Input value to the current category label -->
							<Input bind:value={selectedCategory.label} class="mb-4" disabled={isLoading} />

							<AlertDialog.Footer>
								<AlertDialog.Cancel onclick={() => (isEditDialogOpen = false)}
									>Cancel</AlertDialog.Cancel
								>

								<AlertDialog.Action
									onclick={() => {
										if (selectedCategory) {
											editCategory(selectedCategory);
										}
									}}
									disabled={isLoading}
								>
									{#if isLoading}
										<span
											class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
										></span>
									{:else}
										Save
									{/if}
								</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					{/if}
				</AlertDialog.Root>
			</div>
		{/each}
	</ScrollArea>

	<div class="mt-3 flex flex-row space-x-2">
		<Input
			type="text"
			bind:value={newCategory.label}
			placeholder="New category name"
			class="flex-1 border p-2"
			disabled={isLoading}
		/>

		<Button variant="ghost" onclick={addCategory} disabled={isLoading}>
			{#if isLoading}
				<LoaderCircle class="animate-spin" />
			{:else}
				<CirclePlus />
			{/if}
		</Button>
	</div>
</div>
