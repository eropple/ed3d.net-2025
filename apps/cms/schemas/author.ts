import { defineType, defineField } from 'sanity';
import { slug } from './_helpers';

export const Author = defineType({
  name: 'author',
  title: "Author (Person)",
  type: 'document',
  fields: [
    ...slug('shortName'),
    defineField({
      name: 'fullName', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'shortName', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'avatar', type: 'image',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'email', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => [
        Rule.required(),
        Rule.email(),
      ],
    }),
    defineField({
      name: 'url', type: 'url',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ],
    orderings: [
    {
      name: 'shortNameAsc',
      title: 'Short Name (ascending)',
      by: [
        { field: 'shortName', direction: 'asc' },
      ],
    },
    {
      name: 'shortNameDesc',
      title: 'Short Name (descending)',
      by: [
        { field: 'shortName', direction: 'desc' },
      ],
    },
  ],
});
