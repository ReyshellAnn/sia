<script lang="ts">
	import { onMount } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';

	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
	import { auth, db } from '$lib/firebase';

	import { user } from '$lib/stores/authStore';

	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	let fullName = '';
	let email = '';
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let isLoading = false;
	let errorMessage = '';
	let profileImageUrl = ''; // For storing profile picture URL
	let selectedFile: File | null = null; // For handling selected file
	let selectedImage: string | null = null; // Image preview before upload

	let isDialogOpen = false;

	let isUpdatingProfile = false;
	let isUpdatingPassword = false;

	let activeTab = 'profile';

	onMount(() => {
		user.subscribe((currentUser) => {
			if (currentUser) {
				fullName = currentUser.fullName || '';
				email = currentUser.email || '';
				profileImageUrl = currentUser.profileImageUrl || ''; // Fetch current profile picture URL
			}
		});
	});

	async function updateProfile() {
		isUpdatingProfile = true;
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) {
				errorMessage = 'User not authenticated.';
				return;
			}

			const userDocRef = doc(db, 'users', currentUser.uid);
			await updateDoc(userDocRef, {
				fullName,
				email,
				profileImageUrl
			});

			toast.success('Profile updated successfully!');
		} catch (error) {
			console.error('Error updating profile:', error);
			errorMessage = 'Failed to update profile.';
		} finally {
			isUpdatingProfile = false;
		}
	}

	async function updatePasswordHandler() {
		isUpdatingPassword = true;
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) {
				errorMessage = 'User not authenticated.';
				return;
			}

			if (newPassword !== confirmPassword) {
				errorMessage = 'Passwords do not match!';
				return;
			}

			const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
			await reauthenticateWithCredential(currentUser, credential);
			await updatePassword(currentUser, newPassword);
			toast.success('Password updated successfully!');
		} catch (error) {
			console.error('Error updating password:', error);
			errorMessage = 'Failed to update password. Ensure current password is correct.';
		} finally {
			isUpdatingPassword = false;
		}
	}

	// Handle file selection for preview
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];

			// Show preview before uploading
			const reader = new FileReader();
			reader.onload = () => {
				selectedImage = reader.result as string;
			};
			reader.readAsDataURL(selectedFile);
		}
	}

	// Upload profile picture when user clicks "Save Profile Picture"
	async function saveProfilePicture() {
		if (!selectedFile) {
			alert('Please select an image.');
			return;
		}

		try {
			isLoading = true;

			// Delete old profile image from Cloudinary (if exists)
			if (profileImageUrl) {
				const publicId = profileImageUrl.split('/').pop()?.split('.')[0];

				const deleteResponse = await fetch('/api/delete-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ public_id: publicId })
				});

				const deleteData = await deleteResponse.json();
				if (!deleteResponse.ok) {
					throw new Error(deleteData.error || 'Failed to delete image from Cloudinary');
				}
			}

			// Upload new image to Cloudinary
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

			const response = await fetch(
				`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`,
				{
					method: 'POST',
					body: formData
				}
			);

			const data = await response.json();
			profileImageUrl = data.secure_url; // Store the new image URL

			// Update profile image URL in Firestore
			const currentUser = auth.currentUser;
			if (!currentUser) {
				errorMessage = 'User not authenticated.';
				return;
			}

			const userDocRef = doc(db, 'users', currentUser.uid);
			await updateDoc(userDocRef, {
				profileImageUrl // Update in Firestore
			});

			// ✅ Fetch updated user data and update Svelte store
			const updatedUserSnap = await getDoc(userDocRef);
			if (updatedUserSnap.exists()) {
				user.set({ uid: currentUser.uid, email: currentUser.email, ...updatedUserSnap.data() });
			}

			toast.success('Profile picture updated!');
			selectedImage = null; // Clear preview
			selectedFile = null; // Clear file selection

			isDialogOpen = false;
		} catch (error) {
			console.error('Error uploading profile picture:', error);
			errorMessage = 'Failed to upload profile picture.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex items-center justify-center">
	<Toaster />
	<div
		class="mx-auto flex h-[600px] w-full max-w-6xl flex-col rounded-xl bg-white p-6 shadow-lg sm:flex-row sm:space-x-8 lg:p-0 lg:pr-6"
	>
		<!-- Left Column: Tabs Navigation -->
		<Tabs.Root bind:value={activeTab} class="flex w-full flex-col lg:flex-row">
			<Tabs.List
				class="flex flex-row border-b sm:h-10 sm:w-full sm:space-y-0 md:w-full md:border-b-0 md:border-r lg:h-auto lg:w-1/4 lg:flex-col "
			>
				<Tabs.Trigger value="profile" class="w-full rounded px-4 py-2 text-left hover:bg-gray-100">
					Profile Details
				</Tabs.Trigger>
				<Tabs.Trigger value="password" class="w-full rounded px-4 py-2 text-left hover:bg-gray-100">
					Change Password
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Right Column: Tab Content -->
			<div class="flex-1 p-4">
				<Tabs.Content value="profile">
					<h2 class="text-xl font-semibold text-gray-800">Edit Profile</h2>
					<p class="text-sm text-gray-500">Update your account details</p>

					<!-- Profile Image Section -->
					<div class="flex flex-col items-center space-y-4">
						<div class="relative">
							{#if profileImageUrl}
								<img
									src={profileImageUrl}
									alt="Profile"
									class="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
								/>
							{:else}
								<img
									src="/panda.png"
									alt="Default Profile"
									class="h-28 w-28 rounded-full border-4 border-gray-300 object-cover shadow-md"
								/>
							{/if}
							<!-- <label
								class="absolute bottom-1 right-1 cursor-pointer rounded-full bg-blue-500 p-1 shadow-md transition hover:bg-blue-600"
							>
								<svg
									class="h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
								<Input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
							</label> -->
						</div>

						<!-- Open Dialog on Click -->
						<Dialog.Root bind:open={isDialogOpen}>
							<Dialog.Trigger
								onclick={() => (isDialogOpen = true)}
								class={buttonVariants({ variant: 'default' })}>Change Picture</Dialog.Trigger
							>

							<Dialog.Content class="sm:max-w-[425px]">
								<Dialog.Header>
									<Dialog.Title>Change Profile Picture</Dialog.Title>
									<Dialog.Description>Select an image to preview before saving.</Dialog.Description>
								</Dialog.Header>

								<div class="flex flex-col items-center space-y-4">
									<!-- Image Preview -->
									{#if selectedImage}
										<img
											src={selectedImage}
											alt="Preview"
											class="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
										/>
									{/if}

									<!-- File Input -->
									<Label for="profile-picture" class="block text-gray-600">Upload New Picture</Label
									>
									<Input
										id="profile-picture"
										type="file"
										accept="image/*"
										class="w-full"
										onchange={handleFileChange}
									/>
								</div>

								<Dialog.Footer>
									<Button type="button" onclick={saveProfilePicture} disabled={isLoading}>
										{#if isLoading}
											Saving...
										{:else}
											Save Profile Picture
										{/if}
									</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>

						{#if errorMessage}
							<p class="text-sm text-red-500">{errorMessage}</p>
						{/if}
					</div>

					<!-- Input Fields -->
					<div class="mt-6 flex h-full w-full flex-col space-y-4">
						<div>
							<Label for="full-name" class="block text-gray-600">Full Name</Label>
							<Input
								id="full-name"
								type="text"
								bind:value={fullName}
								class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300"
								required
							/>
						</div>
						<div>
							<Label for="email" class="block text-gray-600">Email</Label>
							<Input
								id="email"
								type="email"
								bind:value={email}
								class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300"
								required
							/>
						</div>

						<!-- This div should now push to the bottom -->
						<div class="mt-auto flex w-full justify-end">
							<Button
								type="button"
								class="rounded-lg bg-black px-4 py-2 text-white shadow transition"
								onclick={updateProfile}
								disabled={isUpdatingProfile}
							>
								{#if isUpdatingProfile}
									Saving...
								{:else}
									Save Changes
								{/if}
							</Button>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="password">
					<h2 class="text-xl font-semibold text-gray-800">Change Password</h2>
					<div class="mt-4 space-y-4">
						<div>
							<Label for="current-password" class="text-gray-600">Current Password</Label>
							<Input
								id="current-password"
								type="password"
								bind:value={currentPassword}
								class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300"
								required
							/>
						</div>
						<div>
							<Label for="new-password" class="text-gray-600">New Password</Label>
							<Input
								id="new-password"
								type="password"
								bind:value={newPassword}
								class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300"
								required
							/>
						</div>
						<div>
							<Label for="confirm-password" class="text-gray-600">Confirm New Password</Label>
							<Input
								id="confirm-password"
								type="password"
								bind:value={confirmPassword}
								class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300"
								required
							/>
						</div>
					</div>
					<div class="flex w-full justify-end">
						<Button
							type="button"
							class="w-sm mt-4 rounded-lg bg-black px-4 py-2 text-white shadow transition"
							onclick={updatePasswordHandler}
							disabled={isUpdatingPassword}
						>
							{#if isUpdatingPassword}
								Updating...
							{:else}
								Update Password
							{/if}
						</Button>
					</div>
				</Tabs.Content>
			</div>
		</Tabs.Root>
	</div>
</div>
