<script lang="ts">
	import type { PageData } from './$types';
	import { SITE_NAME } from '$lib/constants';
	import PageTitle from '$lib/components/typography/PageTitle.svelte';
	import BlogBlurbList from '$lib/components/blog/BlogBlurbList.svelte';
	import BlogCounts from "$lib/components/blog/BlogCounts.svelte";

	export let data: PageData;
	const {
		title, pageNumber, lastPage, blogPosts, blogCounts,
		totalCount, description, category, currentCountable
	} = data;

	const urlForPage = (pageNum: number) => `/blog/by-category/${category}/page/${pageNum}`;

	// Build title part for metadata
	const titlePart = pageNumber === 1 && lastPage === 1
		? title
		: `${title} - page ${pageNumber} of ${lastPage}`;

	const fullTitle = `${titlePart} | ${SITE_NAME}`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={titlePart} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:description" content={fullTitle} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:site" content={SITE_NAME} />
	<meta name="twitter:creator" content="@edropple" />
	<meta name="twitter:title" content={titlePart} />
	<meta name="twitter:description" content={fullTitle} />
</svelte:head>

<PageTitle>Posts in the <em>{category}</em> category</PageTitle>

<div class="md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-8">
	<div class="md:col-span-2 lg:col-span-3 gap-8">
		<div class="flex justify-between my-4">
			{#if pageNumber > 1}
				<a href={urlForPage(pageNumber - 1)} class="underline">Previous page</a>
			{:else}
				<span></span>
			{/if}

			{#if pageNumber < lastPage}
				<a href={urlForPage(pageNumber + 1)} class="underline">Next page</a>
			{:else}
				<span></span>
			{/if}
		</div>

		<BlogBlurbList blogs={blogPosts} />
	</div>
	<div class="invisible md:visible">
		<BlogCounts rollup={blogCounts} current={currentCountable} />
	</div>
</div>