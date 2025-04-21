<script lang="ts">
	import type { PageData } from './$types';
	import BlogPost from '$lib/components/blog/BlogPost.svelte';
	import { SITE_NAME } from '$lib/constants';

	export let data: PageData;
	const { blogPost } = data;
</script>

<svelte:head>
	<title>{blogPost.title} | {SITE_NAME}</title>
	<meta name="description" content={blogPost.blurb} />
	<meta property="og:title" content={blogPost.title} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:description" content={blogPost.blurb} />
	<meta property="og:published_time" content={new Date(blogPost.date).toISOString()} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:site" content={SITE_NAME} />
	<meta name="twitter:creator" content="@edropple" />
	<meta name="twitter:title" content={blogPost.title} />
	<meta name="twitter:description" content={blogPost.blurb} />
</svelte:head>

<BlogPost blog={blogPost} />

<hr class="my-4" />
<p class="text-center italic">
	<a href="/blog">back to the blog index</a>
</p>