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
  
    onMount(() => {
      user.subscribe((currentUser) => {
        if (currentUser) {
          fullName = currentUser.fullName || '';
          email = currentUser.email || '';
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
          email
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
  </script>
  
  <div class="flex flex-row h-screen w-full items-center justify-center px-4">
    <Toaster />
    <div class="flex flex-col sm:flex-row mx-auto max-w-4xl bg-white p-6 rounded-lg shadow-md">
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
  