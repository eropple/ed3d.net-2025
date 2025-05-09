<script lang="ts">
  import RichTextEditor from "$lib/components/RichTextEditor.svelte";
  import type { TipTapPresetKind } from "$lib/shared/tiptap-presets";

  // --- Page Specific State ---
  let editorContent = $state("<p>Hello <strong>world</strong>! This is a test.</p><ul><li>Item 1</li><li>Item 2</li></ul>");
  const editorMode: TipTapPresetKind = "comment";

</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4 text-slate-800">Rich Text Editor Test Page</h1>

  <div class="mb-8 p-4 border border-slate-300 rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-2 text-slate-700">Editor Instance ({editorMode} mode)</h2>
    <RichTextEditor mode={editorMode} bind:content={editorContent} />
  </div>

  <div class="p-4 border border-slate-300 rounded-lg bg-slate-50 shadow">
    <h2 class="text-xl font-semibold mb-2 text-slate-700">Bound Content (Live HTML Output)</h2>
    <pre class="text-sm whitespace-pre-wrap break-all p-3 bg-white text-slate-700 rounded shadow-inner overflow-auto max-h-96">{editorContent}</pre>
  </div>

  <div class="mt-8 p-4 border border-slate-300 rounded-lg bg-slate-50 shadow">
    <h2 class="text-xl font-semibold mb-2 text-slate-700">Rendered Bound Content</h2>
    <div class="prose max-w-none p-3 bg-white rounded shadow-inner">
      {@html editorContent}
    </div>
  </div>

</div>