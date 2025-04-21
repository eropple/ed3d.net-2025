<script lang="ts">
  export let id: string;
  export let markdown: string;
</script>

<span class="sidenote-wrapper">
  <label for={id} class="margin-toggle sidenote-number"></label>
  <input type="checkbox" id={id} class="margin-toggle" />
  <span class="sidenote">
    {@html markdown}
  </span>
</span>