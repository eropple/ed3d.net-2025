import { defineType, defineField } from 'sanity';
import { FIELD_STAGES } from '../util/stages';

export const PodcastEpisode = defineType({
  name: 'podcastShowEpisode',
  title: 'Podcast / Show / Episode',
  type: 'document',
  fields: [
    defineField({
      name: 'show',
      type: 'reference',
      to: [{ type: 'podcast' }],
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'ordering',
      type: 'object',
      fields: [
        defineField({
          name: 'season', type: 'number',
          // @ts-ignore
          codegen: { required: true },
          validation: Rule => Rule.required(),
        }),

        defineField({
          name: 'episode', type: 'number',
          // @ts-ignore
          codegen: { required: true },
          validation: Rule => Rule.required(),
        }),
      ],
    }),

    defineField({
      name: 'title', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    FIELD_STAGES,
    defineField({
      name: 'date',
      type: 'datetime',
      title: 'Date (UTC)',
      initialValue: (new Date()).toUTCString(),
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'description', type: 'text',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'episodeArtRaw',
      type: 'image',
      description: 'The image used for the episode art. It will be composed into the episode art within the episode art generator.',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'segments', type: 'array',
      of: [
        { type: 'podcastShowSegment' },
        {
          type: 'reference',
          to: [ { type: 'podcastShowSegment' } ],
        },
      ],
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => [
        Rule.required(),
        Rule.min(1),
      ],
    }),
  ],
  orderings: [
    {
      name: 'dateDesc',
      title: 'Date (descending)',
      by: [
        { field: 'date', direction: 'desc' },
      ],
    },
  ],
});
