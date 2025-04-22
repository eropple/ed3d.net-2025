import { defineType, defineField } from 'sanity';
import { slug } from '../_helpers';

export const PodcastFeed = defineType({
  name: 'podcastFeed',
  title: 'Podcast / Feed',
  type: 'document',
  fields: [
    ...slug('name'),
    defineField({
      name: 'name', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'podcast',
      type: 'reference',
      to: [{ type: 'podcast' }],
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'feedType',
      type: 'string',
      options: {
        list: [
          { title: 'Standard (public, may have ads)', value: 'standard' },
          { title: 'Premium (private, no ads)', value: 'premium' },
          { title: 'Preview (public, only starter segment)', value: 'preview' },
        ],
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'description',
      type: 'text',
      description: 'This is the description for episodes of this feed which will be injected into episode descriptions. For example, it can include an ad-free feed CTA.',
    }),
  ],
  orderings: [
    {
      name: 'nameThenPodcastAsc',
      title: 'Name then Podcast (ascending)',
      by: [
        { field: 'slug.current', direction: 'asc' },
        { field: 'podcast.name', direction: 'asc' },
      ],
    },
  ],
});
