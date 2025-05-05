import { defineType, defineField } from 'sanity';

export const ImageWithAlt = defineType({
  name: 'imageWithAlt',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: {
        hotspot: true,
        storeOriginalFilename: true,
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'altText',
      type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'caption',
      type: 'string',
    }),
    defineField({
      name: 'attribution',
      type: 'string',
    }),
  ],
});
