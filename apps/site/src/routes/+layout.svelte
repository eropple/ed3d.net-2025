<script lang="ts">
	import "$lib/styles/index";
  import "@fontsource/inconsolata";
  import "@fontsource/lora";
  import "@fontsource/noto-sans-display";
  import { onMount } from 'svelte';
	import { page } from '$app/stores'; // Import page store
	import { getFlash } from 'sveltekit-flash-message'; // Import getFlash
  import { userStore } from '$lib/stores/user';

	import HeaderNav from '$lib/components/HeaderNav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import FlashMessage from '$lib/components/FlashMessage.svelte'; // Assuming we create this component

	let { data, children } = $props();

	// Get the flash message store
	const flash = getFlash(page);

	// Initialize the user store with the data from the server
	// data.user might be undefined initially if flash message loaded first? Check type.
	onMount(() => {
		if (data.user) {
			userStore.setUser(data.user);
		}
	});

	// Update the store whenever the user data changes
	$effect(() => {
		// Check if data.user exists before setting
		if (data.user !== undefined) {
			userStore.setUser(data.user);
		}
	});
</script>

<HeaderNav />
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-lg">
	<!-- Display Flash Message -->
	{#if $flash}
		<FlashMessage type={$flash.type} message={$flash.message} on:dismiss={() => $flash = undefined} />
	{/if}

	{@render children()}
</main>
<Footer />
