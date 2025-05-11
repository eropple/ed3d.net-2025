<script lang="ts">
  import SELF from './CommentNodeDisplay.svelte';
	import type { BlogPostCommentNode, BlogPostCommentType } from '$lib/domain/blogs/types';
  import { generateHTML } from '@tiptap/html';
  import { getPresetExtensions } from '$lib/shared/tiptap-presets';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import { enhance } from '$app/forms';
	import type { JSONContent } from "@tiptap/core";
  import type { ActionData } from './$types';

	let { node, level = 0, form }: {
    node: BlogPostCommentNode,
    level?: number,
    form: ActionData | undefined
  } = $props();

  const commentPresetExtensions = getPresetExtensions('comment');
  const renderedContentHtml = $derived(
    generateHTML(node.value.textContent.contentJson as unknown as JSONContent, commentPresetExtensions)
  );

  let showReplyEditor = $state(false);
  let replyJsonContent = $state<Record<string, any> | undefined>(undefined);
  let replyHtmlContent = $state<string>("");

  function toggleReplyEditor() {
    showReplyEditor = !showReplyEditor;
    if (showReplyEditor) {
      replyJsonContent = undefined;
      replyHtmlContent = "";
    }
  }

  $effect(() => {
    if (form && 'success' in form && form.success && 'newComment' in form) {
      const newComment = form.newComment as BlogPostCommentType | undefined;
      if (newComment?.parentCommentId === node.value.commentId) {
        if (showReplyEditor) {
          showReplyEditor = false;
          replyJsonContent = undefined;
          replyHtmlContent = "";
        }
      }
    }
  });
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
      onclick={toggleReplyEditor}
      class="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
      aria-label="Reply to {node.value.author.username}'s comment"
    >
      {showReplyEditor ? 'Cancel' : 'Reply'}
    </button>
  </div>

  {#if showReplyEditor}
    <div class="mt-3 pt-3 border-t border-gray-200">
      <h4 class="text-sm font-semibold mb-2 text-gray-700">
        Replying to {node.value.author.username}
      </h4>
      <form method="POST" action="?/addComment" use:enhance class="space-y-2">
        <input type="hidden" name="parent_comment_id" value={node.value.commentId} />
        <div>
          <RichTextEditor
            mode={"comment"}
            bind:json={replyJsonContent}
            bind:content={replyHtmlContent}
            placeholder="Write your reply..."
          />
          {#if replyJsonContent}
            <input type="hidden" name="comment_json_content" value={JSON.stringify(replyJsonContent)} />
          {/if}
        </div>
        <button
          type="submit"
          class="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-less-dark disabled:opacity-50"
          disabled={!replyJsonContent || Object.keys(replyJsonContent).length === 0}
        >
          Post Reply
        </button>
      </form>
    </div>
  {/if}

	{#if node.children && node.children.length > 0}
		<div class="children mt-3 pt-3 pl-4 border-l-2 border-gray-200 space-y-3">
			{#each node.children as childNode (childNode.value.commentId)}
				<SELF node={childNode} level={level + 1} form={form} />
			{/each}
		</div>
	{/if}
</div>