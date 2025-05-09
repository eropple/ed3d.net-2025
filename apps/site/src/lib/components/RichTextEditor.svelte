<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type Content } from '@tiptap/core';
  import { getPresetExtensions, type TipTapPresetKind } from '$lib/shared/tiptap-presets';

  // --- Props ---
  // For Svelte 4 style, props are declared with 'export let'
  export let mode: TipTapPresetKind;
  export let content: Content = ""; // HTML string or JSON object

  // --- Reactive variables (Svelte 4 style) ---
  let editorInstance: Editor | null = null; // Will hold the Tiptap Editor instance
  let editorElement: HTMLElement; // Bound to the div Tiptap uses

  let currentView: 'editor' | 'html' = 'editor';
  let htmlOutput: string = "";

  // When 'content' prop changes from the parent, update the editor
  // This is a common pattern for one-way prop updates feeding into the component.
  // For two-way binding, the parent would also listen to an event from this component.
  $: if (editorInstance && typeof content === 'string' && content !== htmlOutput && !editorInstance.isFocused) {
    // Check if editor is not focused to avoid disrupting typing.
    // More complex scenarios might need debouncing or other strategies.
    editorInstance.commands.setContent(content, false); // false: don't emit an 'onUpdate'
    htmlOutput = editorInstance.getHTML(); // Keep htmlOutput in sync
  } else if (editorInstance && typeof content !== 'string' && !editorInstance.isFocused) {
    // Handle non-string content (e.g., JSON) - though our primary flow uses HTML strings
    editorInstance.commands.setContent(content, false);
    htmlOutput = editorInstance.getHTML();
  }


  onMount(() => {
    if (editorElement) {
      const extensions = getPresetExtensions(mode);
      const tiptapEditor = new Editor({
        element: editorElement,
        extensions: extensions,
        content: content, // Initial content
        onUpdate: ({ editor: updatedEditor }) => {
          const currentHTML = updatedEditor.getHTML();
          // To achieve two-way binding in Svelte 4 style, we'd typically dispatch an event:
          // dispatch('contentChange', currentHTML);
          // For simplicity and directness with bind:content in parent, we'll try to update the prop
          // This can sometimes be tricky if parent also updates it.
          // The most robust Svelte 4 way is often event dispatching + parent handling.
          // However, for this iteration, let's see if direct assignment is stable enough
          // *after* initial setup.
          // This will primarily update htmlOutput, and the $: block handles incoming 'content' changes.
          htmlOutput = currentHTML;

          // If we want to try to make `bind:content` work directly, we'd do:
          // content = currentHTML; // This would be the equivalent of what $bindable does
                                // But we need to be careful with loops if parent also sets it.
                                // For now, let htmlOutput be the source of truth for the HTML view.
                                // The parent should update its 'content' based on an event if true 2-way is needed.

          // Let's attempt direct update for bind:content like behavior for now
          if (content !== currentHTML) { // Avoid redundant updates
             content = currentHTML;
          }
        },
      });
      editorInstance = tiptapEditor;
      htmlOutput = editorInstance.getHTML(); // Set initial HTML output
    }

    return () => {
      editorInstance?.destroy();
    };
  });

  // Svelte 4 way to keep htmlOutput in sync if content prop changes after mount
  // and editor isn't focused. This is covered by the $: block above already.
  // $: if (editorInstance && content !== htmlOutput && !editorInstance.isFocused) {
  //   editorInstance.commands.setContent(content, false);
  // }

</script>

<div class="editor-container border rounded">
  <div class="tabs mb-2 border-b">
    <button
      class:selected={currentView === 'editor'}
      on:click={() => currentView = 'editor'}
    >
      Editor
    </button>
    <button
      class:selected={currentView === 'html'}
      on:click={() => currentView = 'html'}
    >
      HTML
    </button>
  </div>

  <!-- This div is the Tiptap editor. It's always in the DOM for stable binding. -->
  <div
    bind:this={editorElement}
    class="tiptap-prose-editor-wrapper prose max-w-none p-2"
    style:display={currentView === 'editor' ? 'block' : 'none'}
  >
    {#if currentView === 'editor' && !editorInstance}
      <p>Loading editor...</p>
    {/if}
  </div>

  {#if currentView === 'html'}
    <pre class="html-output p-2 text-sm overflow-auto bg-gray-50">{htmlOutput}</pre>
  {/if}
</div>

<style>
  .editor-container {
    border-color: #ccc;
  }

  .tabs button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: transparent;
    cursor: pointer;
    color: inherit;
  }
  .tabs button.selected {
    border-bottom: 2px solid blue;
    font-weight: bold;
  }

  .tiptap-prose-editor-wrapper.ProseMirror {
    min-height: 150px;
    outline: none;
  }

  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  .html-output {
    min-height: 150px;
    max-height: 400px;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>