<script lang="ts">
  import type { TextEnvelope, TextFlavor, TextIntent } from "$lib/server/domain/text/types";

  // Props
  export let content: TextEnvelope | null = null;
  export let intent: TextIntent = "longform";
  export let placeholder = "Enter your content here...";
  export let onChange: (content: TextEnvelope) => void = () => {};

  $: envelope = content || {
    version: 1,
    flavor: "tiptap2" as TextFlavor,
    intent,
    tiptap2Content: null
  } as const;

  // This is a stub component - in reality we would integrate tiptap2 here
  let editorContent = "";

  function handleChange(event: Event) {
    const inputValue = (event.target as HTMLTextAreaElement).value;
    editorContent = inputValue;

    // Update the envelope with new content
    const updatedEnvelope: TextEnvelope = {
      ...envelope,
      tiptap2Content: inputValue
    };

    onChange(updatedEnvelope);
  }
</script>

<div class="tiptap-editor">
  <!-- This is a simple placeholder textarea; in reality, we would integrate Tiptap2 here -->
  <textarea
    class="textarea textarea-bordered w-full min-h-[200px]"
    {placeholder}
    value={editorContent}
    on:input={handleChange}
  ></textarea>

  <div class="flex justify-between items-center mt-2 text-sm text-gray-500">
    <span>Rich text editor (Tiptap2)</span>
    <span>Intent: {intent}</span>
  </div>
</div>