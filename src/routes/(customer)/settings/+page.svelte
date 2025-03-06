<script lang="ts">
	import { onMount } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';

	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
	import { auth, db } from '$lib/firebase';

	import { user } from '$lib/stores/authStore';

	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	let fullName = '';
	let email = '';
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let isLoading = false;
	let errorMessage = '';
	let profileImageUrl = ''; // For storing profile picture URL
	let selectedFile: File | null = null; // For handling selected file

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

	// Handle file selection for profile picture upload
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			selectedFile = target.files[0];
		}
	}

	async function uploadProfilePicture() {
		if (!selectedFile) return alert('Please select an image.');

		// If there's an existing profile image, delete it from Cloudinary first
		if (profileImageUrl) {
			const publicId = profileImageUrl.split('/').pop()?.split('.')[0]; // Extract public_id

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

		// Upload the new image to Cloudinary
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
		profileImageUrl = data.secure_url; // Store the image URL

		// Now, update the profileImageUrl in Firestore
		const currentUser = auth.currentUser;
		if (!currentUser) {
			errorMessage = 'User not authenticated.';
			return;
		}

		const userDocRef = doc(db, 'users', currentUser.uid);
		await updateDoc(userDocRef, {
			profileImageUrl // Update the profile picture URL in Firestore
		});

		toast.success('Profile picture updated!');
	}
</script>

<div class="flex items-center justify-center">
	<Toaster />
	<div
		class="mx-auto flex w-full max-w-4xl flex-col rounded-xl bg-white p-6 shadow-lg sm:flex-row sm:space-x-8 h-[550px]"
	>
		<!-- Left Column: Profile Info -->
		<!-- <div class="flex flex-col items-center space-y-6 sm:w-1/2">
			<h2 class="text-xl font-semibold text-gray-800">Edit Profile</h2>
			<p class="mx-4 text-sm text-gray-500">Update your account details</p> -->
		<!-- Profile Image -->
		<!-- <div class="relative">
				{#if profileImageUrl}
					<img src={profileImageUrl} alt="Profile" class="h-28 w-28 rounded-full border-4 border-blue-500 object-cover shadow-md" />
				{:else}
					<img src="/panda.png" alt="Default Profile" class="h-28 w-28 rounded-full border-4 border-gray-300 object-cover shadow-md" />
				{/if}
				<label class="absolute bottom-1 right-1 cursor-pointer rounded-full bg-blue-500 p-1 shadow-md transition hover:bg-blue-600">
					<svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
					<Input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
				</label>
			</div>

			<Button type="button" class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700" onclick={uploadProfilePicture}>
				Upload New Picture
			</Button>

			{#if errorMessage}
				<p class="text-sm text-red-500">{errorMessage}</p>
			{/if}

			<div class="w-full space-y-4">
				<div>
					<Label for="full-name" class="text-gray-600">Full Name</Label>
					<Input id="full-name" type="text" bind:value={fullName} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
				</div>
				<div>
					<Label for="email" class="text-gray-600">Email</Label>
					<Input id="email" type="email" bind:value={email} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
				</div>
			</div>

			<Button type="button" class="w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
				onclick={updateProfile} disabled={isUpdatingProfile}>
				{#if isUpdatingProfile} Saving... {:else} Save Changes {/if}
			</Button>
		</div> -->

<!-- Left Column: Tabs Navigation -->
<Tabs.Root bind:value={activeTab} class="flex w-full flex-col lg:flex-row">
	<Tabs.List class="flex border-b md:border-b-0 md:border-r sm:w-full sm:h-10 md:w-full lg:w-1/4 flex-row lg:flex-col sm:space-y-0 md:h-full">


		<Tabs.Trigger value="profile" class="rounded px-4 py-2 text-left hover:bg-gray-100 w-full">
			Profile Details
		</Tabs.Trigger>
		<Tabs.Trigger value="password" class="rounded px-4 py-2 text-left hover:bg-gray-100 w-full">
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
								<img src={profileImageUrl} alt="Profile" class="h-28 w-28 rounded-full border-4 border-blue-500 object-cover shadow-md" />
							{:else}
								<img src="/panda.png" alt="Default Profile" class="h-28 w-28 rounded-full border-4 border-gray-300 object-cover shadow-md" />
							{/if}
							<label class="absolute bottom-1 right-1 cursor-pointer rounded-full bg-blue-500 p-1 shadow-md transition hover:bg-blue-600">
								<svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
								<Input type="file" accept="image/*" class="hidden" onchange={handleFileChange} />
							</label>
						</div>
			
						<Button type="button" class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700" onclick={uploadProfilePicture}>
							Upload New Picture
						</Button>
			
						{#if errorMessage}
							<p class="text-sm text-red-500">{errorMessage}</p>
						{/if}
					</div>
			
					<!-- Input Fields -->
					<div class="mt-6 w-full space-y-4">
						<div>
							<Label for="full-name" class="block text-gray-600">Full Name</Label>
							<Input id="full-name" type="text" bind:value={fullName} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
						</div>
						<div>
							<Label for="email" class="block text-gray-600">Email</Label>
							<Input id="email" type="email" bind:value={email} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
						</div>
						<Button type="button" class="w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
						onclick={updateProfile} disabled={isUpdatingProfile}>
						{#if isUpdatingProfile} Saving... {:else} Save Changes {/if}
					</Button>
					</div>
		

				</Tabs.Content>

				<Tabs.Content value="password">
					<h2 class="text-xl font-semibold text-gray-800">Change Password</h2>
					<div class="mt-4 space-y-4">
						<div>
							<Label for="current-password" class="text-gray-600">Current Password</Label>
							<Input id="current-password" type="password" bind:value={currentPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
						</div>
						<div>
							<Label for="new-password" class="text-gray-600">New Password</Label>
							<Input id="new-password" type="password" bind:value={newPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
						</div>
						<div>
							<Label for="confirm-password" class="text-gray-600">Confirm New Password</Label>
							<Input id="confirm-password" type="password" bind:value={confirmPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
						</div>
					</div>
		
					<Button type="button" class="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
						onclick={updatePasswordHandler} disabled={isUpdatingPassword}>
						{#if isUpdatingPassword} Updating... {:else} Update Password {/if}
					</Button>
				</Tabs.Content>
			</div>
		</Tabs.Root>

		<!-- Right Column: Change Password -->
		<!-- <div class="mt-6 flex flex-col sm:mt-0 sm:w-1/2">
			<h2 class="text-xl font-semibold text-gray-800 text-center">Change Password</h2>
			<div class="mt-4 space-y-4">
				<div>
					<Label for="current-password" class="text-gray-600">Current Password</Label>
					<Input id="current-password" type="password" bind:value={currentPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
				</div>
				<div>
					<Label for="new-password" class="text-gray-600">New Password</Label>
					<Input id="new-password" type="password" bind:value={newPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
				</div>
				<div>
					<Label for="confirm-password" class="text-gray-600">Confirm New Password</Label>
					<Input id="confirm-password" type="password" bind:value={confirmPassword} class="w-full rounded-lg border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-300" required />
				</div>
			</div>

			<Button type="button" class="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
				onclick={updatePasswordHandler} disabled={isUpdatingPassword}>
				{#if isUpdatingPassword} Updating... {:else} Update Password {/if}
			</Button>
		</div> -->
	</div>
</div>
