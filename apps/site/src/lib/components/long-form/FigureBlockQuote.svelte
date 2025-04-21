<script lang="ts">
  import { QuoteCaption, type QuoteProps } from './_quote-helpers';
  import { PortableText } from '@portabletext/svelte';

  // Using simple props to avoid typing issues
  let { portableText } = $props();

  // Extract values from portableText.value
  let value = $derived(portableText.value);
  let body = $derived(value.body);
  let speaker = $derived(value.speaker);
  let work = $derived(value.work);
  let citeHref = $derived(value.citeHref);

  let caption = $derived(QuoteCaption({ body, speaker, work, citeHref }));
</script>

<figure class="figure-blockquote">
  {#if body}
    <PortableText value={body} />
  {/if}
  {#if caption}
    <figcaption>
      {@html caption.html}
    </figcaption>
  {/if}
</figure>
