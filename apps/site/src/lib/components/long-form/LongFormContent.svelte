<script lang="ts">
  import { PortableText } from '@portabletext/svelte';
  import type { PortableTextComponents } from '@portabletext/svelte';
  import type { BlogPostType } from "$lib/domain/blogs/types.js";

  import FigureBlockQuote from './FigureBlockQuote.svelte';
  import FigureEpigraph from './FigureEpigraph.svelte';
  import CenteredBlock from './CenteredBlock.svelte';
  import UnknownBlockStyle from './UnknownBlockStyle.svelte';
  import SidenoteMark from './SidenoteMark.svelte';

  export let content: BlogPostType["body"];

  const components: PortableTextComponents = {
    block: {
      centered: CenteredBlock,
      normal: undefined, // use default
      h1: undefined, // use default
      h2: undefined, // use default
      h3: undefined, // use default
    },
    types: {
      blockQuote: FigureBlockQuote,
      epigraph: FigureEpigraph,
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
