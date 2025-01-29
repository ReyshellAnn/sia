import { writable } from 'svelte/store';

export const categoriesStore = writable<Array<{ value: string; label: string }>>([]);
