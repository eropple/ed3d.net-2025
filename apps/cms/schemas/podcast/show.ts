import { defineType, defineField } from 'sanity';
import { slug } from '../_helpers';
import { FIELD_STAGES } from '../util/stages';

export const PodcastShow = defineType({
  name: 'podcast',
  title: 'Podcast',
  type: 'document',
  fields: [
    ...slug('title'),
    defineField({
      name: 'title', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    FIELD_STAGES,

    defineField({
      name: 'description', type: 'text',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'iTunesDescription', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'usesSeasons', type: 'boolean',
      initialValue: false,
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'isComplete', type: 'boolean',
      initialValue: false,
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'explicit', type: 'string',
      options: {
        list: [
          { title: 'Explicit', value: 'yes' },
          { title: 'Not Explicit', value: 'no' },
          { title: 'Clean Version', value: 'clean' },
        ],
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'accentColor', type: 'color',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'iTunesCategories', type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'category', type: 'string',
              // @ts-ignore
              codegen: { required: true },
              validation: Rule => Rule.required(),
            }),
            defineField({
              name: 'subCategory', type: 'string',
            }),
          ],
        },
      ],
      validation: Rule => [
        Rule.required(),
        Rule.min(1),
        Rule.max(2),
      ],
    }),

    defineField({
      name: 'iTunesType', type: 'string',
      options: {
        list: [
          { title: 'Serial', value: 'serial' },
          { title: 'Episodic', value: 'episodic' },
        ],
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ],
  orderings: [
    {
      name: 'slugAsc',
      title: 'Slug (ascending)',
      by: [
        { field: 'slug.current', direction: 'asc' },
      ],
    },
  ],
});
