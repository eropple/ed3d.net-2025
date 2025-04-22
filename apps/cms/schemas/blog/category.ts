import { defineType, defineField } from 'sanity';

export const BlogCategory = defineType({
  name: 'blogCategory',
  title: 'Blog / Category',
  type: 'document',
  fields: [
    defineField({
      name: 'slug', type: 'slug',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description', type: 'text',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
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
