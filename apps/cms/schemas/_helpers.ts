import { defineField } from 'sanity';

export function slug(sourceName?: string) {
  return [
    defineField({
      name: 'slug',
      type: 'slug',
      options: sourceName ? { source: sourceName } : undefined,
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ];
}
