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


  let fullName = '';
  let email = '';
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let isLoading = false;
  let errorMessage = '';
  let profileImageUrl = ''; // For storing profile picture URL
  let selectedFile: File | null = null; // For handling selected file

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
    isLoading = true;
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
        profileImageUrl // Update the profile picture URL as well
      });

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      errorMessage = 'Failed to update profile.';
    } finally {
      isLoading = false;
    }
  }

  async function updatePasswordHandler() {
    isLoading = true;
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
      isLoading = false;
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
  if (!selectedFile) return alert("Please select an image.");

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
  formData.append("file", selectedFile);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

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

<div class="flex flex-row h-screen w-full">
<Toaster />
<div class="flex flex-col sm:flex-row mx-auto w-full bg-white p-6 rounded-lg shadow-md">
  <!-- Left column for Edit Profile -->
  <div class="flex-1 space-y-6">
    <h2 class="text-2xl font-semibold text-center">Edit Profile</h2>
    <p class="text-center text-gray-600 mb-4">Update your account details below</p>

    {#if errorMessage}
      <p class="text-sm text-red-500">{errorMessage}</p>
    {/if}

    <div class="grid grid-cols-1 gap-4">
      <div class="grid gap-2">
        <Label for="full-name">Full Name</Label>
        <Input id="full-name" type="text" bind:value={fullName} required />
      </div>
      <div class="grid gap-2">
        <Label for="email">Email</Label>
        <Input id="email" type="email" bind:value={email} required />
      </div>
    </div>

    <Button type="button" class="w-full mt-4" onclick={updateProfile} disabled={isLoading}>
      {#if isLoading}
        <span>Saving...</span>
      {:else}
        Save Changes
      {/if}
    </Button>
  </div>

  <!-- Right column for Change Password -->
  <div class="flex-1 space-y-6 sm:ml-8 mt-6 sm:mt-0">
    <h2 class="text-xl font-semibold text-center">Change Password</h2>
    <div class="grid grid-cols-1 gap-4">
      <div class="grid gap-2">
        <Label for="current-password">Current Password</Label>
        <Input id="current-password" type="password" bind:value={currentPassword} required />
      </div>
      <div class="grid gap-2">
        <Label for="new-password">New Password</Label>
        <Input id="new-password" type="password" bind:value={newPassword} required />
      </div>
      <div class="grid gap-2">
        <Label for="confirm-password">Confirm New Password</Label>
        <Input id="confirm-password" type="password" bind:value={confirmPassword} required />
      </div>
    </div>

    <Button type="button" class="w-full mt-4" onclick={updatePasswordHandler} disabled={isLoading}>
      {#if isLoading}
        <span>Updating...</span>
      {:else}
        Update Password
      {/if}
    </Button>
  </div>
</div>
</div>

<!-- Display Profile Image -->
<div class="profile-image">
{#if profileImageUrl}
  <img src={profileImageUrl} alt="Profile" class="w-24 h-24 rounded-full object-cover" />
{:else}
  <img src="/placeholder.png" alt="Default Profile" class="w-24 h-24 rounded-full object-cover" />
{/if}
</div>

<!-- Upload Profile Picture -->
<div class="mt-4">
<Input type="file" accept="image/*" onchange={handleFileChange} />
<Button type="button" onclick={uploadProfilePicture}>Upload Profile Picture</Button>
</div>
