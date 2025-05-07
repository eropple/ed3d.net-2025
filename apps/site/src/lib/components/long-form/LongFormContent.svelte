<script lang="ts">
  import { PortableText } from '@portabletext/svelte';
  import type { PortableTextComponents } from '@portabletext/svelte';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  import type { BlogPostType } from "$lib/domain/blogs/types.js";

  import FigureBlockQuote from './FigureBlockQuote.svelte';
  import FigureEpigraph from './FigureEpigraph.svelte';
  import CenteredBlock from './CenteredBlock.svelte';
  import UnknownBlockStyle from './UnknownBlockStyle.svelte';
  import SidenoteMark from './SidenoteMark.svelte';
  import ImageWithAlt from './ImageWithAlt.svelte';
  import YoutubeEmbed from './YoutubeEmbed.svelte';
  let { content, imageUrlsByKey = {} } = $props<{
    content: BlogPostType["body"],
    imageUrlsByKey: Record<string, string>
  }>();

  // Create a store with the image URLs and make it available to child components
  const imageUrls = writable(imageUrlsByKey);
  setContext('imageUrls', imageUrls);

  const components: PortableTextComponents = {
    block: {
      centered: CenteredBlock,
    },
    types: {
      blockQuote: FigureBlockQuote,
      epigraph: FigureEpigraph,
      imageWithAlt: ImageWithAlt,
      youtubeEmbed: YoutubeEmbed,
    },
    marks: {
      sidenote: SidenoteMark,
    },
    unknownBlockStyle: UnknownBlockStyle,
  };
</script>

<main class="long-form-content">
  <PortableText value={content} {components} />
</main>
