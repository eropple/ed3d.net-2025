<script lang="ts">
  import Sidenote from './Sidenote.svelte';

  let { portableText, children } = $props();
  let value = $derived(portableText.value);
</script>

{@render children()}
<Sidenote id={value._key} markdown={value.markdown} />