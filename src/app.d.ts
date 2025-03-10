// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: {
			  uid: string;
			  email: string | undefined;
			  role?: string; // Optional, add more fields if needed
			  // You can add more properties from your Firestore user document
			} | null;
		  }
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
