import { defineType, defineField } from 'sanity';

export const BlockQuote = defineType({
  name: 'blockQuote',
  title: 'Block Quote',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      type: 'simpleContent',
    }),
    defineField({
      name: 'speaker',
      title: 'Speaker',
      type: 'string',
    }),
    defineField({
      name: 'work',
      title: 'Work',
      type: 'string',
    }),
    defineField({
      name: 'citeHref',
      title: 'Cite Link',
      type: 'url',
    }),
  ],
});

export const Epigraph = defineType({
  ...BlockQuote,
  name: 'epigraph',
  title: 'Epigraph',
});
