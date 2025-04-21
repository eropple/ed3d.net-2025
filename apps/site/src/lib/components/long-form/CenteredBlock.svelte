<script lang="ts">
  // Using simple props to avoid typing issues
  let { portableText, children } = $props();
</script>

<p class="text-center">
  {@render children()}
</p>
