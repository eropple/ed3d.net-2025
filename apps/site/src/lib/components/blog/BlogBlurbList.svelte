<script lang="ts">
	import BlogBlurb from "./BlogBlurb.svelte";

  export let blogs: any[] = [];
</script>

<div class="space-y-8">
  {#each blogs as blog}
    <BlogBlurb {blog} showCTA={true} />
  {/each}
</div>