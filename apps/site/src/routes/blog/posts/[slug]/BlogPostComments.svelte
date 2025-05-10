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
	let newCommentJson = $state<Record<string, any> | undefined>(undefined);
	let newCommentHtml = $state<string>("");
	let showSuccessMessage = $state(false);
	let submissionError = $state<string | null>(null);

	// State for the reply editor
	let replyingToCommentId = $state<string | null>(null);
	let replyTargetAuthorUsername = $state<string | null>(null);
	let replyCommentJson = $state<Record<string, any> | undefined>(undefined);
	let replyCommentHtml = $state<string>("");
	let showReplySuccessMessage = $state(false);
	let replySubmissionError = $state<string | null>(null);
	let replyEditorRef: HTMLElement | null = $state(null);

	// Sort Order State & Cookie Handling
	const SORT_ORDER_COOKIE_KEY = 'comment_sort_order';
	type SortOrder = 'oldest-first' | 'newest-first';
	let currentSortOrder = $state<SortOrder>('oldest-first');
	let initializedFromCookie = $state(false); // To ensure cookie is written only after initial read

	// Effect for one-time cookie read on mount
	$effect(() => {
		if (browser && !initializedFromCookie) {
			const storedOrder = getCookie(SORT_ORDER_COOKIE_KEY);
			if (storedOrder === 'newest-first' || storedOrder === 'oldest-first') {
				currentSortOrder = storedOrder;
			}
			initializedFromCookie = true;
		}
	});

	// Effect to persist sortOrder to cookie when it changes
	$effect(() => {
		if (browser && initializedFromCookie) { // Only save after initial load
			setCookie(SORT_ORDER_COOKIE_KEY, currentSortOrder, 365); // Expires in 1 year
		}
	});

	// Raw comments tree state - this holds the unsorted tree
	let rawCommentsTree = $state<BlogPostCommentTree>(initialComments);

	// Effect to update rawCommentsTree from initial props or form refresh actions
	$effect(() => {
		if (form?.refreshedComments) {
			rawCommentsTree = form.refreshedComments;
		} else {
			// Fallback to initialComments if no refreshedComments from the current form state.
			// This handles initial load and cases where initialComments prop itself changes.
			rawCommentsTree = initialComments;
		}
	});

	// Effect for processing form outcomes (messages, editor clear)
	let prevFormForMessages = $state<ActionData | undefined>(form);
	$effect(() => {
		if (form !== prevFormForMessages) {
			if (form?.refreshedComments) {
				rawCommentsTree = form.refreshedComments;
			} else if (form === undefined && prevFormForMessages?.refreshedComments) {
				// Navigated away or form cleared after a successful action that returned refreshedComments
				// initialComments may update if page reloads or props change
			} else if (!form?.refreshedComments && initialComments !== rawCommentsTree && (!form || !form.newComment) ) {
				// Fallback to initialComments if form has no refreshedComments, it's not a new comment submission outcome,
				// and rawCommentsTree is out of sync with initialComments (e.g. initial prop load/change)
				rawCommentsTree = initialComments;
			}

			// Handle error messages
			if (form && typeof form === 'object' && 'error' in form && form.error) {
				let errorMessage = form.error as string;
				if (form.details && typeof form.details === 'string') {
					errorMessage += ` (${form.details})`;
				}
				console.error("Error from action:", errorMessage, "Attempted parent ID:", form.parentCommentIdAttempted);

				// Check if the error was related to a reply attempt
				if (form.parentCommentIdAttempted && form.parentCommentIdAttempted === replyingToCommentId) {
					replySubmissionError = errorMessage;
					submissionError = null; // Clear main form error
				} else if (form.parentCommentIdAttempted && !replyingToCommentId) {
					// Error from main form that looks like it tried to be a reply (e.g. bad parent_comment_id manually inserted)
					submissionError = errorMessage + " (Error with parent comment ID)";
					replySubmissionError = null;
				}
				 else { // Error from main form, or a general error
					submissionError = errorMessage;
					replySubmissionError = null; // Clear reply form error
				}
				showSuccessMessage = false;
				showReplySuccessMessage = false;
			} else if (form?.success && form?.newComment) {
				// `rawCommentsTree` updated above by `form.refreshedComments`
				submissionError = null;
				replySubmissionError = null;

				if (form.newComment.parentCommentId) {
					showReplySuccessMessage = true;
					setTimeout(() => showReplySuccessMessage = false, 3000);

					replyCommentJson = undefined;
					replyCommentHtml = "";
					replyingToCommentId = null;
					replyTargetAuthorUsername = null;
				} else {
					showSuccessMessage = true;
					setTimeout(() => showSuccessMessage = false, 3000);
					newCommentJson = undefined;
					newCommentHtml = "";
				}
			} else if (form?.refreshedComments && (!form.newComment && !form.error)) {
				// Successful 'refreshComments' action. Clear any lingering messages.
				submissionError = null;
				replySubmissionError = null;
				showSuccessMessage = false;
				showReplySuccessMessage = false;
			} else if (form === undefined && prevFormForMessages) {
				// Form was cleared by navigation or some other SvelteKit mechanism
				submissionError = null;
				replySubmissionError = null;
				showSuccessMessage = false;
				showReplySuccessMessage = false;
			}
			prevFormForMessages = form;
		}
	});

	// Derived state for the displayed (sorted) comments tree
	const sortTopLevelComments = (tree: BlogPostCommentTree | undefined, order: SortOrder): BlogPostCommentTree => {
		if (!tree) return { __type: "BlogPostCommentTree", children: [] }; // Handle null/undefined tree

		const sortedChildren = [...tree.children].sort((aNode, bNode) => {
			const dateA = new Date(aNode.value.createdAt).getTime();
			const dateB = new Date(bNode.value.createdAt).getTime();

			if (isNaN(dateA) && isNaN(dateB)) return 0;
			if (isNaN(dateA)) return 1; // Invalid dates sort after valid ones
			if (isNaN(dateB)) return -1;

			return order === 'oldest-first' ? dateA - dateB : dateB - dateA;
		});
		return { ...tree, children: sortedChildren }; // Create new object with sorted children
	};

	let commentsTree = $derived(sortTopLevelComments(rawCommentsTree, currentSortOrder));

	function initiateReply(event: CustomEvent<{ commentId: string; authorUsername: string }>) {
		replyingToCommentId = event.detail.commentId;
		replyTargetAuthorUsername = event.detail.authorUsername;
		replyCommentJson = undefined;
		replyCommentHtml = "";
		replySubmissionError = null;
		showReplySuccessMessage = false;
		setTimeout(() => {
			replyEditorRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 0);
	}

	function cancelReply() {
		replyingToCommentId = null;
		replyTargetAuthorUsername = null;
		replyCommentJson = undefined;
		replyCommentHtml = "";
		replySubmissionError = null;
		showReplySuccessMessage = false;
	}
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

	{#if replyingToCommentId}
		<div bind:this={replyEditorRef} class="my-6 p-4 border border-secondary rounded-lg shadow-md bg-slate-50">
			<h3 class="text-lg font-semibold mb-3">
				Replying to <span class="font-bold text-primary">{replyTargetAuthorUsername}</span>
			</h3>
			<form method="POST" action="?/addComment" use:enhance class="space-y-3">
				<input type="hidden" name="parent_comment_id" value={replyingToCommentId} />
				<div>
					<RichTextEditor
						mode={"comment"}
						bind:json={replyCommentJson}
						bind:content={replyCommentHtml}
					/>
					{#if replyCommentJson}
						<input type="hidden" name="comment_json_content" value={JSON.stringify(replyCommentJson)} />
					{/if}
				</div>
				<div class="flex items-center space-x-3">
					<button
						type="submit"
						class="px-4 py-2 bg-primary text-white rounded hover:bg-less-dark disabled:opacity-50"
						disabled={!replyCommentJson || Object.keys(replyCommentJson).length === 0}
					>
						Post Reply
					</button>
					<button
						type="button"
						onclick={cancelReply}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
					>
						Cancel
					</button>
				</div>
				{#if replySubmissionError}
					<p class="text-sm text-error mt-1">{replySubmissionError}</p>
				{/if}
				{#if showReplySuccessMessage}
					<p class="text-sm text-green-600 mt-1">Reply posted successfully!</p>
				{/if}
			</form>
		</div>
	{/if}

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
				<CommentNodeDisplay node={commentNode} on:initiateReply={initiateReply} />
			{/each}
		</div>
	{:else}
		<p>No comments yet. Be the first to comment!</p>
	{/if}
</section>
