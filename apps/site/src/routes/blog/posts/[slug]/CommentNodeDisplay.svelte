<script lang="ts">
  import Self from './CommentNodeDisplay.svelte';
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import type { BlogPostCommentNode, BlogPostCommentType, HiddenCommentPlaceholderType } from '$lib/domain/blogs/types';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { generateHTML } from '@tiptap/html';
	import { getPresetExtensions } from '$lib/shared/tiptap-presets';
	import { slide } from 'svelte/transition';
	import { page } from '$app/state';
	import type { JSONContent } from "@tiptap/core";
	import { shortDateStyle } from '$lib/dates';
	import { DateTime } from 'luxon';

	let { node, form, isStaff, canModerate, canPost, isLoggedInButEmailNotVerified }: {
		node: BlogPostCommentNode,
		form: ActionData,
		isStaff: boolean,
		canModerate: boolean,
		canPost: boolean,
		isLoggedInButEmailNotVerified: boolean
	} = $props();

	let replyingToCommentId = $state<string | null>(null);
	let replyJson = $state<Record<string, any> | undefined>(undefined);
	let replyHtml = $state<string>("");
	let showReplySuccessMessage = $state(false);
	let replySubmissionError = $state<string | null>(null);

	// Helper to determine if the current node is a BlogPostCommentType (not a placeholder)
	const isActualComment = (n: BlogPostCommentNode): n is BlogPostCommentNode & { value: BlogPostCommentType } => {
		return n.value.__type === 'BlogPostComment';
	};

	// Content rendering (only if it's an actual comment)
	let renderedContentHtml = $derived(
		isActualComment(node) && node.value.textContent?.contentJson
			? generateHTML(node.value.textContent.contentJson as unknown as JSONContent, getPresetExtensions(node.value.textContent.kind))
			: ''
	);

	// Effect for handling reply submissions and toggles
	$effect(() => {
		let newReplySubmissionError: string | null = null;
		let newShowReplySuccessMessage = false;

		if (form && form !== null && typeof form === 'object') {
			const parentIdAttempted = (form as any).parentCommentIdAttempted as string | null | undefined;
			const success = (form as any).success as boolean | undefined;
			const error = (form as any).error as string | undefined;
			const details = (form as any).details as string | undefined;
			const newCommentResult = (form as any).newComment as BlogPostCommentType | undefined;
			const toggledCommentId = (form as any).toggledCommentId as string | undefined;


			// Case 1: Error during reply submission to *this* comment
			if (error && parentIdAttempted === node.value.commentId) {
				newReplySubmissionError = details ? `${error} (${details})` : error;
			}
			// Case 2: Successful reply to *this* comment
			else if (success && newCommentResult && newCommentResult.parentCommentId === node.value.commentId) {
				newShowReplySuccessMessage = true;
				if (replyJson !== undefined) replyJson = undefined;
				if (replyHtml !== "") replyHtml = "";
				if (replyingToCommentId === node.value.commentId) {
					replyingToCommentId = null; // Close editor
				}
			}
			// Case 3: Successful toggle visibility of *this* comment
			else if (success && toggledCommentId && toggledCommentId === node.value.commentId) {
				// If reply editor was open for this comment, close it.
				if (replyingToCommentId === node.value.commentId) {
					replyingToCommentId = null;
					if (replyJson !== undefined) replyJson = undefined;
					if (replyHtml !== "") replyHtml = "";
				}
			}
		}

		if (replySubmissionError !== newReplySubmissionError) {
			replySubmissionError = newReplySubmissionError;
		}
		if (showReplySuccessMessage !== newShowReplySuccessMessage) {
			showReplySuccessMessage = newShowReplySuccessMessage;
		}

		if (newShowReplySuccessMessage) {
			setTimeout(() => {
				if (showReplySuccessMessage) showReplySuccessMessage = false;
			}, 3000);
		}
	});


	function toggleReplyEditor() {
		if (replyingToCommentId === node.value.commentId) {
			replyingToCommentId = null;
			replyJson = undefined;
			replyHtml = "";
			replySubmissionError = null;
		} else {
			replyingToCommentId = node.value.commentId;
			// Reset form state for the new editor instance
			replyJson = undefined;
			replyHtml = "";
			replySubmissionError = null;
		}
	}

	const currentUserIsAuthor = $derived(
		isActualComment(node) && page.data.user && page.data.user.userId === node.value.author.userId
	);

	function formatDateTimeET(date: Date | string | undefined): string {
		if (!date) return "";
		const dt = DateTime.fromJSDate(typeof date === 'string' ? new Date(date) : date).setZone('America/New_York');
		return `${shortDateStyle(dt.toJSDate())} at ${dt.toFormat('h:mm a')}`;
	}

</script>

<article id="comment-{node.value.commentId}" class="comment-node group relative border border-gray-200 rounded-lg p-4 space-y-3">
	{#if node.value.__type === "HiddenCommentPlaceholder"}
		<div class="italic text-gray-500">
			<p>{node.value.message}</p>
		</div>
	{:else if node.value.__type === "BlogPostComment"}
		{@const comment = node.value}
		<header class="flex items-center space-x-2">
			<!-- <UserAvatar user={comment.author} size="sm" /> -->
			<div>
				<a
					href="/users/{comment.author.username}"
					class="font-semibold hover:underline {isStaff && comment.hiddenAt ? 'text-red-600' : 'text-gray-800'}"
				>
					{comment.author.username}
					{#if currentUserIsAuthor}(you){/if}
					{#if isStaff && comment.author.userId && page.data.user?.grants?.isStaff}
						<span class="text-xs font-normal text-primary">(Staff)</span>
					{/if}
				</a>
				<p class="text-xs {isStaff && comment.hiddenAt ? 'text-red-500' : 'text-gray-500'}">
					{formatDateTimeET(comment.createdAt)}
					{#if isStaff && comment.hiddenAt}
						<span class="font-semibold">(Hidden at {formatDateTimeET(comment.hiddenAt)})</span>
					{/if}
				</p>
			</div>
		</header>

		<div class="prose max-w-none text-gray-700 {isStaff && comment.hiddenAt ? 'opacity-60' : ''}">{@html renderedContentHtml}</div>

		<footer class="flex items-center justify-end space-x-3 pt-2">
			{#if canModerate}
				<form method="POST" action="?/toggleCommentVisibility" use:enhance class="inline-block">
					<input type="hidden" name="commentId" value={comment.commentId} />
					{#if comment.hiddenAt}
						<input type="hidden" name="hideState" value="false" />
						<button type="submit" class="text-xs font-medium text-green-600 hover:underline focus:outline-none">
							Unhide
						</button>
					{:else}
						<input type="hidden" name="hideState" value="true" />
						<button type="submit" class="text-xs font-medium text-red-600 hover:underline focus:outline-none">
							Hide
						</button>
					{/if}
				</form>
				<span class="text-gray-300">|</span>
			{/if}

			{#if canPost}
			<button onclick={toggleReplyEditor} class="text-xs font-medium text-primary hover:underline focus:outline-none">
				{#if replyingToCommentId === comment.commentId}Cancel Reply{:else}Reply{/if}
			</button>
			{/if}
		</footer>

		{#if replyingToCommentId === comment.commentId && canPost}
			<div class="pt-3 border-t border-gray-200" transition:slide>
				<form method="POST" action="?/addComment" use:enhance class="space-y-2">
					<input type="hidden" name="parent_comment_id" value={comment.commentId} />
					<div>
						<RichTextEditor
							mode={"comment"}
							bind:json={replyJson}
							bind:content={replyHtml}
							placeholder="Write your reply..."
						/>
						{#if replyJson}
							<input type="hidden" name="comment_json_content" value={JSON.stringify(replyJson)} />
						{/if}
					</div>
					<button
						type="submit"
						class="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-less-dark disabled:opacity-50"
						disabled={!replyJson || Object.keys(replyJson).length === 0}
					>
						Post Reply
					</button>
					{#if replySubmissionError}
						<p class="text-xs text-error mt-1">{replySubmissionError}</p>
					{/if}
					{#if showReplySuccessMessage}
						<p class="text-xs text-green-600 mt-1">Reply posted successfully!</p>
					{/if}
				</form>
			</div>
		{/if}
	{/if}


	{#if node.children && node.children.length > 0}
		<div class="ml-6 md:ml-10 pl-4 border-l-2 border-gray-200 space-y-4 mt-4">
			{#each node.children as childNode (childNode.value.commentId)}
				<Self {node} {form} {isStaff} {canModerate} {canPost} {isLoggedInButEmailNotVerified} />
			{/each}
		</div>
	{/if}
</article>