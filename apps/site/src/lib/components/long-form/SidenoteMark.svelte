<script lang="ts">
  import Sidenote from './Sidenote.svelte';

  // Using simple props to avoid typing issues
  let { portableText, children } = $props();
  let value = $derived(portableText.value);
</script>

<span title={JSON.stringify(value)}>
  {@render children()}
  <Sidenote id={value._key} markdown={value.markdown} />
</span>
