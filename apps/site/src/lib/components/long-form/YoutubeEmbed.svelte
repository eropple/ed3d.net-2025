<script lang="ts">
  import Youtube from 'svelte-youtube-embed';
  import type { YoutubeEmbedContent } from '$lib/server/domain/blogs/projections.js';

  // Portable Text passes in portableText and children props
  let { portableText } = $props<{
    portableText: {
      value: YoutubeEmbedContent & { _key: string }
    },
    children: Function
  }>();

  // The actual data is in portableText.value
  const value = $derived(portableText.value);
</script>

<div class="w-full md:w-3/5 lg:w-3/4">
  <figure
    class="
      my-8
      mx-auto
      border border-[var(--color-primary)]
      rounded-md
      p-2 md:p-4
    "
  >
    <Youtube id={value.youtubeId} thumbnail={undefined} play_button={undefined} />

    {#if value.title}
      <figcaption class="text-center text-sm mt-2 text-gray-600 px-2">
        <span class="italic">{value.title}</span>
      </figcaption>
    {/if}
  </figure>
</div>
