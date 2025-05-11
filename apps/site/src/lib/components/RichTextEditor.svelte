<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type Content, type AnyExtension } from '@tiptap/core';
  import { getPresetExtensions, type TipTapPresetKind } from '$lib/shared/tiptap-presets';
  import { Placeholder } from '@tiptap/extension-placeholder';

  // --- Props ---
  export let mode: TipTapPresetKind;
  export let content: Content = ""; // HTML content (can be string or JSON for initialization, becomes string for binding)
  export let json: Record<string, any> | undefined = undefined; // ProseMirror JSON content (for binding)
  export let placeholder: string | undefined = undefined;

  // --- Component State ---
  let editorInstance: Editor | null = null;
  let editorElement: HTMLElement;
  let currentView: 'editor' | 'html' = 'editor';
  let htmlOutput: string = "";
  let activeExtensionNames = new Set<string>(); // To store names of active extensions
  let currentBlockType: 'paragraph' | 'codeBlock' | 'blockquote' | 'other' = 'paragraph'; // For the dropdown

  // Reactive update if 'content' prop changes from parent
  $: if (editorInstance && typeof content === 'string' && content !== editorInstance.getHTML() && !editorInstance.isFocused) {
    editorInstance.commands.setContent(content, false); // This will trigger onUpdate
    // htmlOutput and json will be updated by the onUpdate handler
  } else if (editorInstance && typeof content !== 'string' && content !== editorInstance.getJSON() && !editorInstance.isFocused) { // If initial content is JSON
    editorInstance.commands.setContent(content, false); // This will trigger onUpdate
  }

  onMount(() => {
    if (editorElement) {
      const baseExtensions = getPresetExtensions(mode);
      activeExtensionNames = new Set(baseExtensions.map(ext => ext.name)); // Store names of active extensions

      const extensionsWithPlaceholder = [
        ...baseExtensions,
        ...(placeholder ? [Placeholder.configure({ placeholder })] : [])
      ];

      const tiptapEditor = new Editor({
        element: editorElement,
        extensions: extensionsWithPlaceholder,
        content: content, // Initial content (can be HTML string or JSON object from prop)
        onUpdate: ({ editor: updatedEditor }) => {
          const currentHTML = updatedEditor.getHTML();
          const currentJSON = updatedEditor.getJSON();

          htmlOutput = currentHTML; // For the internal HTML tab view

          // Update the parent's bound 'content' prop (will be HTML string)
          if (content !== currentHTML) {
            content = currentHTML;
          }
          // Update the parent's bound 'json' prop
          // Simple stringify for comparison to avoid potential issues if Tiptap always returns new object instances
          if (JSON.stringify(json) !== JSON.stringify(currentJSON)) {
            json = currentJSON;
          }
        },
        onTransaction: ({ editor: trEditor }) => {
          editorInstance = editorInstance; // For Svelte's reactivity on editor.isActive()

          // Update currentBlockType for the dropdown
          if (trEditor.isActive('paragraph')) {
            currentBlockType = 'paragraph';
          } else if (trEditor.isActive('codeBlock')) {
            currentBlockType = 'codeBlock';
          } else if (trEditor.isActive('blockquote')) {
            currentBlockType = 'blockquote';
          } else {
            currentBlockType = 'other'; // Or handle other block types if they become relevant
          }
        }
      });
      editorInstance = tiptapEditor;

      // Initialize/update bound props after editor creation based on initial content
      const currentHTMLInitial = editorInstance.getHTML();
      const currentJSONInitial = editorInstance.getJSON();

      if (content !== currentHTMLInitial) { // Ensures parent 'content' reflects actual HTML if initial was JSON
        content = currentHTMLInitial;
      }
      json = currentJSONInitial; // Initialize parent 'json'
      htmlOutput = currentHTMLInitial; // For internal HTML tab view
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

  function toggleBlockquote() {
    editorInstance?.chain().focus().toggleBlockquote().run();
  }

  function toggleBulletList() {
    editorInstance?.chain().focus().toggleBulletList().run();
  }

  function toggleOrderedList() {
    editorInstance?.chain().focus().toggleOrderedList().run();
  }

  function toggleCodeBlock() {
    editorInstance?.chain().focus().toggleCodeBlock().run();
  }

  function setParagraph() {
    editorInstance?.chain().focus().setParagraph().run();
  }

  function handleBlockTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;

    if (value === 'paragraph') {
      setParagraph();
    } else if (value === 'codeBlock') {
      toggleCodeBlock();
    } else if (value === 'blockquote') {
      toggleBlockquote();
    }
    editorInstance?.chain().focus().run(); // Ensure focus returns to the editor
  }

  function toggleCode() { // For inline code
    editorInstance?.chain().focus().toggleCode().run();
  }

  function setLink() {
    const previousUrl = editorInstance?.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editorInstance?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editorInstance?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function toggleSubscript() {
    editorInstance?.chain().focus().toggleSubscript().run();
  }

  function toggleSuperscript() {
    editorInstance?.chain().focus().toggleSuperscript().run();
  }

</script>

<div class="editor-container border rounded">
  <div class="tabs mb-2 border-b">
    <button
      class:selected={currentView === 'editor'}
      on:click={() => currentView = 'editor'}
    >
      Edit
    </button>
    <button
      class:selected={currentView === 'html'}
      on:click={() => currentView = 'html'}
    >
      Preview
    </button>
  </div>

  {#if currentView === 'editor'}
    <div class="toolbar mb-2 p-1 border-b">
      {#if editorInstance}
        {#if activeExtensionNames.has('paragraph') || activeExtensionNames.has('codeBlock') || activeExtensionNames.has('blockquote')}
          <select
            class="toolbar-select"
            on:change={handleBlockTypeChange}
            title="Block type"
          >
            <option value="paragraph" selected={currentBlockType === 'paragraph'}>Normal</option>
            {#if activeExtensionNames.has('codeBlock')}
              <option value="codeBlock" selected={currentBlockType === 'codeBlock'}>Code Block</option>
            {/if}
            {#if activeExtensionNames.has('blockquote')}
              <option value="blockquote" selected={currentBlockType === 'blockquote'}>Quote</option>
            {/if}
            <!-- Add other block types here if needed -->
          </select>
        {/if}
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
        {#if activeExtensionNames.has('code')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('code')}
            on:click={toggleCode}
            title="Code"
          >
            &lt;/&gt;
          </button>
        {/if}
        {#if activeExtensionNames.has('link')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('link')}
            on:click={setLink}
            title="Link"
          >
            Link
          </button>
        {/if}
        {#if activeExtensionNames.has('bulletList')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('bulletList')}
            on:click={toggleBulletList}
            title="Bullet List"
          >
            UL
          </button>
        {/if}
        {#if activeExtensionNames.has('orderedList')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('orderedList')}
            on:click={toggleOrderedList}
            title="Ordered List"
          >
            OL
          </button>
        {/if}
        {#if activeExtensionNames.has('subscript')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('subscript')}
            on:click={toggleSubscript}
            title="Subscript"
          >
            X₂
          </button>
        {/if}
        {#if activeExtensionNames.has('superscript')}
          <button
            class="toolbar-button"
            class:active={editorInstance.isActive('superscript')}
            on:click={toggleSuperscript}
            title="Superscript"
          >
            X²
          </button>
        {/if}
      {:else}
        <span class="text-xs text-gray-500">Loading toolbar...</span>
      {/if}
    </div>
  {/if}

  <div
    bind:this={editorElement}
    class="tiptap-prose-editor-wrapper prose max-w-none p-2"
    style:display={currentView === 'editor' ? 'block' : 'none'}
    data-placeholder={placeholder}
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

  .toolbar-button, .toolbar-select { /* Apply similar styling to select */
    font-family: sans-serif;
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    cursor: pointer;
    border-radius: 3px;
    /* font-weight: bold; Ensure select text is not bold if not desired */
    min-width: 28px;
    text-align: left; /* For select, left align might be better */
  }
  .toolbar-select {
    padding-right: 1.5rem; /* Make space for dropdown arrow */
    appearance: none; /* Optional: for custom arrow styling later */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1em 1em;
  }

  .toolbar-button:hover, .toolbar-select:hover {
    background-color: #eee;
  }

  /* svelte-ignore css_unused_selector */
  .tiptap-prose-editor-wrapper.ProseMirror {
    min-height: 150px;
    outline: none;
  }

  /*
    Tiptap's Placeholder extension adds its own ::before pseudo-element styling.
    The global style below (often found in Tiptap examples) targets that.
    Ensure this doesn't conflict with other global styles if you have them.
  */
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