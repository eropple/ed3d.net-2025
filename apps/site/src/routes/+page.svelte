<script lang="ts">
	import { SITE_NAME } from '$lib/constants';
	import BlogBlurbList from '$lib/components/blog/BlogBlurbList.svelte';
	import BlogCounts from '$lib/components/blog/BlogCounts.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { blogPosts, blogCounts } = data;
</script>

<svelte:head>
	<title>Home | {SITE_NAME}</title>
	<meta name="description" content="Ed does a lot of things. You'll find a decent number of them here." />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={`Home | ${SITE_NAME}`} />
	<meta name="twitter:creator" content="@edropple" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:site" content={SITE_NAME} />
	<meta name="twitter:description" content="Ed does a lot of things. You'll find a decent number of them here." />
</svelte:head>

<div class="md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-8">
	<div class="md:col-span-2 lg:col-span-3">
		<BlogBlurbList blogs={blogPosts} />
	</div>
	<div class="invisible md:visible">
		<img
			src="/images/ed-index.jpg"
			alt="Ed's smiling face."
			class="h-auto w-full aspect-square mb-4"
			style="border-radius: 5%;"
		/>
		<p class="text-sm mb-4">
			Hello. I am Ed. This is a blog. I blog here.
		</p>
		<p class="text-sm">Anybody wanna start a webring?</p>
		<hr class="my-4" />
		<BlogCounts rollup={blogCounts} />
	</div>
</div>