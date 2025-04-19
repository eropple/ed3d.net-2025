<script lang="ts">
	import "../app.css";
	import { page } from "$app/state";

	let { children } = $props();
</script>

{#if page.data.user}
<pre>
  {JSON.stringify(page.data.user, null, 2)}
</pre>
{:else}
<pre>
  Not logged in
</pre>
{/if}


<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
