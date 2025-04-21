<script lang="ts">
  export let id: string;
  export let markdown: string;
</script>

<label for={`sn-${id}`} class="margin-toggle sidenote-number"></label>
<input type="checkbox" id={`sn-${id}`} class="margin-toggle" />
<span class="sidenote">
  {@html markdown}
</span>