<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import type { BlogPostCommentTree, BlogPostCommentNode, BlogPostCommentType } from '$lib/domain/blogs/types';
	import CommentNodeDisplay from './CommentNodeDisplay.svelte';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { browser } from '$app/environment';
	import { getCookie, setCookie } from '$lib/client/cookies';

	// Props: initial comments tree and the form action data from the page
	let { initialComments, form }: { initialComments: BlogPostCommentTree, form: ActionData } = $props();

	// State for the new top-level comment editor
	let rawCommentsTree = $state(initialComments);
	let newCommentJson = $state<Record<string, any> | undefined>(undefined);
	let newCommentHtml = $state<string>("");
	let showSuccessMessage = $state(false);
	let submissionError = $state<string | null>(null);

	// Sort Order State & Cookie Handling
	const SORT_ORDER_COOKIE_KEY = 'comment_sort_order';
	type SortOrder = 'oldest-first' | 'newest-first';
	let currentSortOrder = $state<SortOrder>('oldest-first');
	let initializedFromCookie = $state(false);

	// This state variable helps ensure we only 'reset' to initialComments
	// under very specific conditions after the initial setup, if absolutely needed,
	// or we can remove this reset logic if form.refreshedComments is always authoritative.
	let hasInitializedRawComments = false;

	// Use a simple 'let' variable, NOT $state.
	// This variable will persist across renders of this component instance
	// but won't be a reactive proxy.
	let instanceLastProcessedForm: ActionData | undefined = undefined;

	$effect(() => {
		if (browser && !initializedFromCookie) {
			const storedOrder = getCookie(SORT_ORDER_COOKIE_KEY);
			if (storedOrder === 'newest-first' || storedOrder === 'oldest-first') {
				currentSortOrder = storedOrder;
			}
			initializedFromCookie = true;
		}
	});

	$effect(() => {
		if (browser && initializedFromCookie) {
			setCookie(SORT_ORDER_COOKIE_KEY, currentSortOrder, 365);
		}
	});

	// Effect 1: Manage rawCommentsTree based *only* on form action outcomes
	$effect(() => {
		if (form && form !== instanceLastProcessedForm) {
			if (form.refreshedComments) {
				if (rawCommentsTree !== form.refreshedComments) {
					rawCommentsTree = form.refreshedComments;
				}
			}
			instanceLastProcessedForm = form;
		} else if (!form && instanceLastProcessedForm) {
			instanceLastProcessedForm = undefined;
		}
	});

	// Effect 2: Manage UI messages and top-level form clearing (should be okay)
	$effect(() => {
		let newSubmissionError: string | null = null;
		let newShowSuccessMessage = false;

		if (form && 'error' in form && typeof form.error === 'string') {
			let errorMessage = form.error;
			const parentIdAttempted = (form as any).parentCommentIdAttempted as string | null | undefined;
			if (form.details && typeof form.details === 'string') {
				errorMessage += ` (${form.details})`;
			}
			if (parentIdAttempted) {
				newSubmissionError = `Failed to post reply: ${errorMessage}`;
			} else {
				newSubmissionError = errorMessage;
			}

		} else if (form && 'success' in form && form.success && 'newComment' in form) {
			const newComment = form.newComment as BlogPostCommentType | undefined;
			if (!newComment?.parentCommentId) {
				newShowSuccessMessage = true;
				if (newCommentJson !== undefined) newCommentJson = undefined;
				if (newCommentHtml !== "") newCommentHtml = "";
			}
		}

		if (submissionError !== newSubmissionError) {
			submissionError = newSubmissionError;
		}
		if (showSuccessMessage !== newShowSuccessMessage) {
			showSuccessMessage = newShowSuccessMessage;
		}

		if (newShowSuccessMessage) {
			setTimeout(() => {
				if (showSuccessMessage) showSuccessMessage = false;
			}, 3000);
		}
	});

	const sortTopLevelComments = (tree: BlogPostCommentTree | undefined, order: SortOrder): BlogPostCommentTree => {
		if (!tree) return { __type: "BlogPostCommentTree", children: [] };

		const sortedChildren = [...tree.children].sort((aNode, bNode) => {
			const dateA = new Date(aNode.value.createdAt).getTime();
			const dateB = new Date(bNode.value.createdAt).getTime();
			if (isNaN(dateA) && isNaN(dateB)) return 0;
			if (isNaN(dateA)) return 1;
			if (isNaN(dateB)) return -1;
			return order === 'oldest-first' ? dateA - dateB : dateB - dateA;
		});
		return { ...tree, children: sortedChildren };
	};

	let commentsTree = $derived(sortTopLevelComments(rawCommentsTree, currentSortOrder));
</script>

<section aria-labelledby="comments-heading" class="space-y-6">
	<div>
		<h3 class="text-xl font-semibold mb-3">Add a Comment</h3>
		<form method="POST" action="?/addComment" use:enhance class="space-y-3">
			<div>
				<RichTextEditor
					mode={"comment"}
					bind:json={newCommentJson}
					bind:content={newCommentHtml}
					placeholder="Write a new comment..."
				/>
				{#if newCommentJson}
					<input type="hidden" name="comment_json_content" value={JSON.stringify(newCommentJson)} />
				{/if}
			</div>
			<button
				type="submit"
				class="px-4 py-2 bg-primary text-white rounded hover:bg-less-dark disabled:opacity-50"
				disabled={!newCommentJson || Object.keys(newCommentJson).length === 0}
			>
				Post Comment
			</button>
			{#if submissionError}
				<p class="text-sm text-error mt-1">{submissionError}</p>
			{/if}
			{#if showSuccessMessage}
				<p class="text-sm text-green-600 mt-1">Comment posted successfully!</p>
			{/if}
		</form>
	</div>

	<hr />

	<div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
		<h2 id="comments-heading" class="text-2xl font-semibold">
			Comments {#if commentsTree && commentsTree.children}({commentsTree.children.length}){:else}(0){/if}
		</h2>
		<div class="flex flex-col sm:flex-row sm:items-center w-full sm:w-auto space-y-3 sm:space-y-0 sm:space-x-3">
			<div class="w-full sm:w-auto">
				<label for="comment-sort-order" class="sr-only">Sort order</label>
				<select
					id="comment-sort-order"
					bind:value={currentSortOrder}
					class="w-full sm:w-auto px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-secondary focus:border-secondary text-sm"
				>
					<option value="oldest-first">Oldest First</option>
					<option value="newest-first">Newest First</option>
				</select>
			</div>
			<form method="POST" action="?/refreshComments" use:enhance class="w-full sm:w-auto">
				<button
					type="submit"
					class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-secondary"
				>
					Refresh Comments
				</button>
			</form>
		</div>
	</div>

	{#if commentsTree && commentsTree.children.length > 0}
		<div class="space-y-4">
			{#each commentsTree.children as commentNode (commentNode.value.commentId)}
				<CommentNodeDisplay node={commentNode} form={form} />
			{/each}
		</div>
	{:else}
		<p>No comments yet. Be the first to comment!</p>
	{/if}
</section>
