import { defineType, defineField } from 'sanity';

export const PodcastShowSegment = defineType({
  name: 'podcastShowSegment',
  title: 'Podcast / Segment',
  type: 'document',
  fields: [
    defineField({
      name: 'segmentName', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'audio',
      type: 'object',
      fields: [
        defineField({
          name: 'clip',
          title: 'Audio clip',
          type: 'reference',
          to: [{ type: 'podcastAudioClip' }],
          // @ts-ignore
          codegen: { required: true },
          validation: Rule => Rule.required(),
        }),

        defineField({
          name: 'start',
          title: 'Clip start (seconds)',
          type: 'number',
        }),

        defineField({
          name: 'end',
          title: 'Clip end (seconds)',
          type: 'number',
        }),
      ],
    }),

    defineField({
      name: 'skipAsChapter', type: 'boolean',
      description: "If set, this segment will be skipped when creating chapters/timestamps.",
    }),

    defineField({
      name: 'isAd',
      title: 'Is an ad?',
      description: "If set, this will be omitted from ad-free feeds.",
      type: 'boolean',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'includeInPreview',
      title: 'Include in preview?',
      description: "If set, this will be cut into episodes that go into preview feeds.",
      type: 'boolean',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ],
});
