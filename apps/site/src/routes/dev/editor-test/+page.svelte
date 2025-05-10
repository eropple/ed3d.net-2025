<script lang="ts">
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import type { TipTapPresetKind } from "$lib/shared/tiptap-presets";

  // --- Page Specific State ---
  let editorHtmlContent = $state("<p>Hello <strong>world</strong>! This is a test.</p><ul><li>Item 1</li><li>Item 2</li></ul>");
  let editorJsonContent = $state<Record<string, any> | undefined>(undefined);
  const editorMode: TipTapPresetKind = "comment";

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4 text-slate-800">Rich Text Editor Test Page</h1>

  <form method="POST" action="?/validateContent" class="mb-8">
    <div class="mb-4 p-4 border border-slate-300 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-2 text-slate-700">Editor Instance ({editorMode} mode)</h2>
      <RichTextEditor
        mode={editorMode}
        bind:content={editorHtmlContent}
        bind:json={editorJsonContent}
      />
      {#if editorJsonContent}
        <input type="hidden" name="editor_content_json" value={JSON.stringify(editorJsonContent)} />
      {/if}
    </div>
    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" disabled={!editorJsonContent}>
      Validate Content on Server
    </button>
  </form>

  <div class="p-4 border border-slate-300 rounded-lg bg-slate-50 shadow">
    <h2 class="text-xl font-semibold mb-2 text-slate-700">Bound HTML Content (Live Output)</h2>
    <pre class="text-sm whitespace-pre-wrap break-all p-3 bg-white text-slate-700 rounded shadow-inner overflow-auto max-h-96">{editorHtmlContent}</pre>
  </div>

  {#if editorJsonContent}
    <div class="mt-4 p-4 border border-slate-300 rounded-lg bg-slate-50 shadow">
      <h2 class="text-xl font-semibold mb-2 text-slate-700">Bound JSON Content (Live Output)</h2>
      <pre class="text-sm whitespace-pre-wrap break-all p-3 bg-white text-slate-700 rounded shadow-inner overflow-auto max-h-96">{JSON.stringify(editorJsonContent, null, 2)}</pre>
    </div>
  {/if}

  <div class="mt-8 p-4 border border-slate-300 rounded-lg bg-slate-50 shadow">
    <h2 class="text-xl font-semibold mb-2 text-slate-700">Rendered HTML Content</h2>
    <div class="prose max-w-none p-3 bg-white rounded shadow-inner">
      {@html editorHtmlContent}
    </div>
  </div>

</div>