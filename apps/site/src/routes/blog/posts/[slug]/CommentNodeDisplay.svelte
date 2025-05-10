<script lang="ts">
  import SELF from './CommentNodeDisplay.svelte';
	import type { BlogPostCommentNode } from '$lib/domain/blogs/types';
  import { createEventDispatcher } from 'svelte';
  import { generateHTML } from '@tiptap/html';
  import { getPresetExtensions, type TipTapPresetKind } from '$lib/shared/tiptap-presets';

	let { node, level = 0 }: { node: BlogPostCommentNode, level?: number } = $props();
  const dispatch = createEventDispatcher<{ initiateReply: { commentId: string, authorUsername: string } }>();

  const commentPresetExtensions = getPresetExtensions('comment');

  const renderedContentHtml = $derived(
    generateHTML(node.value.textContent.contentJson, commentPresetExtensions)
  );

  function handleReplyClick() {
    dispatch('initiateReply', { commentId: node.value.commentId, authorUsername: node.value.author.username });
  }
</script>

<div
  style="margin-left: {level * 20}px;"
  class="comment-node flex flex-col border border-gray-200 rounded-md shadow-sm bg-white p-3 mb-3"
>
	<div class="flex-grow">
		<div class="flex justify-between items-start">
			<div class="flex-grow">
				<p class="font-semibold text-gray-800">
					{node.value.author.username}
					<span class="ml-2 text-xs text-gray-500 font-normal">({new Date(node.value.createdAt).toLocaleString()})</span>
				</p>

				<div class="mt-1 prose prose-sm max-w-none tiptap-prose-editor-wrapper">
					{@html renderedContentHtml}
				</div>
			</div>
		</div>
	</div>

  <div class="mt-2 flex justify-end">
    <button
      onclick={handleReplyClick}
      class="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
      aria-label="Reply to {node.value.author.username}'s comment"
    >
      Reply
    </button>
  </div>

	{#if node.children && node.children.length > 0}
		<div class="children mt-3 pt-3 pl-4 border-l-2 border-gray-200 space-y-3">
			{#each node.children as childNode (childNode.value.commentId)}
				<SELF node={childNode} level={level + 1} />
			{/each}
		</div>
	{/if}
</div>