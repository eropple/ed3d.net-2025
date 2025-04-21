<script lang="ts">
  import { shortDateStyle } from '$lib/dates';
  import { blogPostUrl, blogCategoryListUrl, blogTagListUrl } from '$lib/url-builders';
	import type { BlogPostShortType } from "../../domain/blogs/types.js";
  import ArticleTitle from '../ArticleTitle.svelte';

  export let blog: BlogPostShortType;
  export let showCTA = false;

  // Ensure blog.tags is an array or provide a default
  $: tags = blog.tags || [];
</script>

<article>
  <ArticleTitle title={blog.title} href={blogPostUrl(blog.slug)} />
  <div class="grid grid-cols-3 mt-2">
    <div class="col-span-2">
      <p>
        {blog.blurb}&nbsp;
        {#if showCTA}
          <a href={blogPostUrl(blog.slug)} class="italic font-semibold">
            read the post &raquo;
          </a>
        {/if}
      </p>
    </div>
    <div class="text-right">
      <p class="text-lg">{shortDateStyle(blog.date)}</p>
      <p class="italic">
        <a href={blogCategoryListUrl(blog.category.slug)}>
          {blog.category.slug}
        </a>
      </p>
      <ul class="italic text-sm">
        {#each tags as tag, idx}
          <li class="inline-block pl-2">
            <a href={blogTagListUrl(tag.slug)} class="normal-link">
              {tag.slug}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</article>