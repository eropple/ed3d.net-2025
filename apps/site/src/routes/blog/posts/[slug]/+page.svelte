<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import BlogPost from '$lib/components/blog/BlogPost.svelte';
	import { SITE_NAME } from '$lib/constants';
	import BlogPostComments from './BlogPostComments.svelte';

	let { data, form }: { data: PageData, form: ActionData } = $props();
	const { blogPost, commentsTree: initialCommentsTree, isStaff, user } = data;

	console.log(user);

	const canModerate = $derived(user?.grants?.comments?.moderate ?? false);
	const canPost = $derived(user?.grants?.comments?.post ?? false);
	const isLoggedInButEmailNotVerified = $derived(!!user && !user.emailVerified);
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
	<meta name="twitter:creator" content="@ed3d.net" />
	<meta name="twitter:title" content={blogPost.title} />
	<meta name="twitter:description" content={blogPost.blurb} />
</svelte:head>

<BlogPost blog={blogPost} />

<hr class="my-8 border-gray-300" />

<BlogPostComments
	initialComments={initialCommentsTree}
	{form}
	{isStaff}
	{canModerate}
	{canPost}
	{isLoggedInButEmailNotVerified}
/>

<hr class="my-4" />
<p class="text-center italic">
	<a href="/blog">back to the blog index</a>
</p>