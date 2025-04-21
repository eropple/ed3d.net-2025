<script lang="ts">
  // Using simple props to avoid typing issues
  let { portableText, children } = $props();
</script>

<p>
  UNKNOWN BLOCK STYLE - {@render children()}
</p>
