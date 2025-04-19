<script lang="ts">
	import "../app.css";
	import { page } from "$app/state";

	let { children } = $props();
</script>

{@render children()}
