import { writable } from 'svelte/store';

export const isLoading = writable<boolean>(true);
export const clothReady = writable<boolean>(false);
