<script lang="ts">
  import type { Editor, Content } from "@tiptap/core";
  import type { Readable } from 'svelte/store';
  import { get } from 'svelte/store'; // Import get for synchronous access to store value
  import { createEditor, EditorContent } from "svelte-tiptap";
  import { getPresetExtensions, type TipTapPresetKind } from "$lib/shared/tiptap-presets";

  // --- Props ---
  let { mode, content = $bindable("") } = $props<{
    mode: TipTapPresetKind;
    content?: Content; // Can be HTML string, JSON, or Document
  }>();

  // --- State ---
  // editorStore will hold the Readable<Editor> store returned by createEditor
  let editorStore = $state<Readable<Editor> | null>(null);
  let editorElement = $state<HTMLElement | undefined>(undefined);

  let currentView = $state<'editor' | 'html'>('editor');
  let htmlOutput = $state("");

  // Effect for editor creation and destruction
  $effect(() => {
    const el = editorElement;
    // Only create if element is available and editorStore hasn't been initialized yet
    if (el && !editorStore) {
      const extensions = getPresetExtensions(mode);
      const tiptapReadableEditor = createEditor({ // This returns Readable<Editor>
        element: el,
        extensions: extensions,
        content: content, // Initial content from prop
        onUpdate: ({ editor: actualEditorInstance }) => { // actualEditorInstance IS an Editor instance
          const currentHTML = actualEditorInstance.getHTML();
          content = currentHTML; // Update bound 'content' prop with HTML
          htmlOutput = currentHTML; // Update HTML output for the view
        },
      });
      editorStore = tiptapReadableEditor; // Assign the store

      // Set initial htmlOutput after editor is created by getting the instance from the store
      const initialEditorInstance = get(tiptapReadableEditor);
      if (initialEditorInstance) {
        htmlOutput = initialEditorInstance.getHTML();
      }
    }

    return () => {
      // To destroy, we need the actual editor instance from the store
      const currentEditorInstance = editorStore ? get(editorStore) : null;
      currentEditorInstance?.destroy();
      editorStore = null; // Clear the store on component destruction
    };
  });

  // Effect to handle external changes to the 'content' prop
  $effect(() => {
    const currentEditorInstance = editorStore ? get(editorStore) : null;
    if (currentEditorInstance && content !== htmlOutput && !currentEditorInstance.isFocused) {
      const { from, to } = currentEditorInstance.state.selection;
      currentEditorInstance.commands.setContent(content, false); // false: don't emit 'onUpdate'
      try {
        // Attempt to restore selection if the content length/structure allows
        currentEditorInstance.commands.setTextSelection({ from: Math.min(from, currentEditorInstance.state.doc.content.size), to: Math.min(to, currentEditorInstance.state.doc.content.size) });
      } catch (e) {
        currentEditorInstance.commands.focus('end');
      }
      htmlOutput = currentEditorInstance.getHTML(); // Sync htmlOutput
    }
  });

</script>

<div class="editor-container border rounded">
  <div class="tabs mb-2 border-b">
    <button
      class:selected={currentView === 'editor'}
      onclick={() => currentView = 'editor'}
    >
      Editor
    </button>
    <button
      class:selected={currentView === 'html'}
      onclick={() => currentView = 'html'}
    >
      HTML
    </button>
  </div>

  {#if currentView === 'editor' && $editorStore}
    {@const editor: any = $editorStore}
    <div bind:this={editorElement} class="prose dark:prose-invert max-w-none p-2">
      {#if editorStore}
        <EditorContent editor={editor} />
      {:else}
        <p>Loading editor...</p>
      {/if}
    </div>
  {:else if currentView === 'html'}
    <pre class="html-output p-2 text-sm overflow-auto bg-gray-50 dark:bg-gray-800">{htmlOutput}</pre>
  {/if}
</div>

<style>
  .editor-container {
    border-color: #ccc;
  }
  .dark .editor-container {
    border-color: #555;
  }

  .tabs button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: transparent;
    cursor: pointer;
    color: inherit; /* Ensure text color inherits for dark mode */
  }
  .tabs button.selected {
    border-bottom: 2px solid blue; /* Theme this color */
    font-weight: bold;
  }
  .dark .tabs button.selected {
    border-bottom-color: lightblue; /* Theme this color for dark mode */
  }

  .prose :global(.tiptap) {
    min-height: 150px;
    outline: none;
  }

  :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }
  .dark :global(.tiptap p.is-editor-empty:first-child::before) {
    color: #777;
  }

  .html-output {
    min-height: 150px;
    max-height: 400px;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>