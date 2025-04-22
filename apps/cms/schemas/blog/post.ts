import { defineType, defineField } from 'sanity';
import { slug } from '../_helpers';
import { FIELD_STAGES } from '../util/stages';

export const BlogPost = defineType({
  name: 'blogPost',
  title: 'Blog / Post',
  type: 'document',
  fields: [
    ...slug('title'),
    defineField({
      name: 'title', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'blurb', type: 'text',
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
      name: 'author', type: 'reference', to: [{ type: 'author' }],
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'category', type: 'reference', to: [{ type: 'blogCategory' }],
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'tags', type: 'array', of: [{ type: 'reference', to: [{ type: 'blogTag' }] }]
    }),
    defineField({
      name: 'body', type: 'longFormBlockContent',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ],
  orderings: [
    {
      name: 'dateDesc',
      title: 'Date (descending) then title (ascending)',
      by: [
        { field: 'date', direction: 'desc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
});
