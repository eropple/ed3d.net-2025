<script lang="ts">
	import "$lib/styles/index";
  import "@fontsource/inconsolata";
  import "@fontsource/lora";
  import "@fontsource/noto-sans-display";
  import { onMount } from 'svelte';
  import { userStore } from '$lib/stores/user';

	import HeaderNav from '$lib/components/HeaderNav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { data, children } = $props();

	// Initialize the user store with the data from the server
	onMount(() => {
		userStore.setUser(data.user);
	});

	// Update the store whenever the user data changes
	$effect(() => {
		userStore.setUser(data.user);
	});
</script>

<HeaderNav />
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-lg">
	{@render children()}
</main>
<Footer />
