<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type Content, type AnyExtension } from '@tiptap/core';
  import { getPresetExtensions, type TipTapPresetKind } from '$lib/shared/tiptap-presets';

  // --- Props ---
  export let mode: TipTapPresetKind;
  export let content: Content = "";

  // --- Component State ---
  let editorInstance: Editor | null = null;
  let editorElement: HTMLElement;
  let currentView: 'editor' | 'html' = 'editor';
  let htmlOutput: string = "";
  let activeExtensionNames = new Set<string>(); // To store names of active extensions

  // Reactive update if 'content' prop changes from parent
  $: if (editorInstance && typeof content === 'string' && content !== htmlOutput && !editorInstance.isFocused) {
    editorInstance.commands.setContent(content, false);
    htmlOutput = editorInstance.getHTML();
  } else if (editorInstance && typeof content !== 'string' && !editorInstance.isFocused) {
    editorInstance.commands.setContent(content, false);
    htmlOutput = editorInstance.getHTML();
  }

  onMount(() => {
    if (editorElement) {
      const extensions = getPresetExtensions(mode);
      activeExtensionNames = new Set(extensions.map(ext => ext.name)); // Store names of active extensions

      const tiptapEditor = new Editor({
        element: editorElement,
        extensions: extensions,
        content: content,
        onUpdate: ({ editor: updatedEditor }) => {
          const currentHTML = updatedEditor.getHTML();
          htmlOutput = currentHTML;
          // Update the 'content' prop for bind:content to work
          if (content !== currentHTML) {
            content = currentHTML;
          }
        },
        onTransaction: () => {
          editorInstance = editorInstance; // For Svelte's reactivity on editor.isActive()
        }
      });
      editorInstance = tiptapEditor;
      htmlOutput = editorInstance.getHTML();
    }

    return () => {
      editorInstance?.destroy();
    };
  });

  // Toolbar button actions
  function toggleBold() {
    editorInstance?.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    editorInstance?.chain().focus().toggleItalic().run();
  }
  // Add more toggle functions here for other buttons as needed e.g. toggleCode, toggleLink etc.

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

  {#if currentView === 'editor'}
    <div class="toolbar mb-2 p-1 border-b">
      {#if editorInstance}
        {#if activeExtensionNames.has('bold')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('bold')}
            on:click={toggleBold}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
        {/if}
        {#if activeExtensionNames.has('italic')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('italic')}
            on:click={toggleItalic}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
        {/if}
        <!-- {/*
          Dynamically add other buttons based on activeExtensionNames:
          e.g.
          {#if activeExtensionNames.has('code')} ... toggleCode ... {/if}
          {#if activeExtensionNames.has('link')} ... setLink ... {/if}
          {#if activeExtensionNames.has('strike')} ... toggleStrike ... {/if}
          {#if activeExtensionNames.has('bulletList')} ... toggleBulletList ... {/if}
          {#if activeExtensionNames.has('orderedList')} ... toggleOrderedList ... {/if}
          {#if activeExtensionNames.has('blockquote')} ... toggleBlockquote ... {/if}
          {#if activeExtensionNames.has('codeBlock')} ... toggleCodeBlock ... {/if}
        */} -->
      {:else}
        <span class="text-xs text-gray-500">Loading toolbar...</span>
      {/if}
    </div>
  {/if}

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

  .toolbar {
    display: flex;
    gap: 0.25rem;
    border-color: #eee;
    flex-wrap: wrap; /* Allow buttons to wrap if many */
  }

  .toolbar-button {
    font-family: sans-serif;
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
    min-width: 28px; /* Ensure buttons have some minimum width */
    text-align: center;
  }
  .toolbar-button:hover {
    background-color: #eee;
  }
  .toolbar-button.active {
    background-color: #ddd;
    border-color: #bbb;
  }

  /* svelte-ignore css_unused_selector */
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