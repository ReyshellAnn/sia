<script lang="ts">
    import { onMount } from "svelte";
    import { collection, getDocs } from "firebase/firestore";
    import { db } from "$lib/firebase";
  
    let documents: any[] = [];
    let error: string | null = null;
  
    onMount(async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "test"));
        documents = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (err) {
        // Safely cast 'err' to 'Error' to access the 'message' property
        if (err instanceof Error) {
          error = err.message;
        } else {
          error = String(err); // Fallback for non-Error types
        }
        console.error("Error fetching Firestore data:", err);
      }
    });
  </script>
  this is medicine page
  <h1>Firestore Test</h1>
  
  {#if error}
    <p style="color: red;">Error: {error}</p>
  {/if}
  
  <ul>
    {#each documents as doc}
      <li>
        <strong>{doc.name}</strong>: {doc.value}
      </li>
    {/each}
  </ul>
  