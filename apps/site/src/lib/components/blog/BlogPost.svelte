<script lang="ts">
	import type { BlogPostType } from "../../domain/blogs/types.js";
  import LongFormContent from '../long-form/LongFormContent.svelte';
  import BlogBlurb from './BlogBlurb.svelte';

  export let blog: BlogPostType;
</script>

<BlogBlurb {blog} />
<hr class="my-4" />
<LongFormContent content={blog.body} />
<div class="long-form-content">
  <p class="text-right">&ndash;{blog.author.shortName}</p>
</div>
