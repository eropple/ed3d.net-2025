import { defineType, defineField } from 'sanity';

export const BlogTag = defineType({
  name: 'blogTag',
  title: 'Blog / Tag',
  type: 'document',
  fields: [
    defineField({
      name: 'slug', type: 'slug',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description', type: 'text'
    }),
  ],
  preview: {
    select: {
      title: 'slug.current',
    }
  },
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
