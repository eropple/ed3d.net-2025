<script lang="ts">
  import PageTitle from './typography/PageTitle.svelte';

  export let title: string;
  export let href: string;
</script>

<PageTitle>
  <a href={href}>{title}</a>
</PageTitle>