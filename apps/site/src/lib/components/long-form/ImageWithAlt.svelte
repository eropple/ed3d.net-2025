<script lang="ts">
  import { getContext } from 'svelte';
  import type { ImageWithAltContent } from '$lib/server/domain/blogs/projections.js';
  import type { SanityImageAsset } from '$lib/server/sanity/sanity-content-types.js';

  // Portable Text passes in portableText and children props
  let { portableText } = $props<{
    portableText: {
      value: Omit<ImageWithAltContent, 'image'> & { _key: string; image: SanityImageAsset }
    },
    children: Function
  }>();

  // The actual data is in portableText.value
  const value = $derived(portableText.value);

  // Get image URLs from context
  const imageUrls = getContext<Record<string, string>>('imageUrls');

  // Use the CDN URL if available, fall back to the original URL
  const finalImageUrl = $derived(imageUrls[value._key] || value.image.url);

  // Adjust paths for lqip and dimensions
  const lqip = $derived(value.image.metadata?.lqip);
  const dimensions = $derived(value.image.metadata?.dimensions);

  const hasCaption = $derived(!!value.caption || !!value.attribution);

  const width = $derived(dimensions?.width);
  const height = $derived(dimensions?.height);
  const aspectRatio = $derived(dimensions?.aspectRatio);
  const paddingBottom = $derived(aspectRatio ? `${(1 / aspectRatio) * 100}%` : '0%');
</script>

<div class="w-full md:w-3/5 lg:w-3/4">
  <figure
    class="
      my-8
      w-full lg:w-9/10
      mx-auto
      border border-[var(--color-primary)]
      rounded-md
      p-2 md:p-4
    "
  >
    {#if aspectRatio}
      <div class="relative w-full" style={`padding-bottom: ${paddingBottom};`}>
        <img
          src={finalImageUrl}
          alt={value.altText}
          width={width}
          height={height}
          loading="lazy"
          class="absolute top-0 left-0 w-full h-full object-contain"
          style={lqip ? `background-size: cover; background-image: url(${lqip});` : ''}
        />
      </div>
    {:else if finalImageUrl}
      <!-- Fallback for images without aspect ratio data, though less ideal -->
      <img
          src={finalImageUrl}
          alt={value.altText}
          loading="lazy"
          class="w-full h-auto"
          style={lqip ? `background-size: cover; background-image: url(${lqip});` : ''}
      />
    {/if}
    {#if hasCaption}
      <figcaption class="text-center text-sm mt-2 text-gray-600 px-2">
        {#if value.caption}
          <span class="italic">{value.caption}</span>
        {/if}
        {#if value.caption && value.attribution}
          <br />
        {/if}
        {#if value.attribution}
          <span class="block text-xs italic">{value.attribution}</span>
        {/if}
      </figcaption>
    {/if}
  </figure>
</div>
