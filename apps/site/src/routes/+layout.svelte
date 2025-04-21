<script lang="ts">
	import "$lib/styles/index";
  import "@fontsource/inconsolata";
  import "@fontsource/lora";
  import "@fontsource/noto-sans-display";

	import HeaderNav from '$lib/components/HeaderNav.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();
</script>

<HeaderNav />
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-lg">
	{@render children()}
</main>
<Footer />
