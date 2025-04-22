import { defineField } from 'sanity';

export const StagesObject = defineField({
  name: 'stages',
  title: 'Stages this post is accessible in',
  type: 'object',
  fields: [
    defineField({
      name: 'development', type: 'boolean', initialValue: true
    }),
    defineField({
      name: 'production', type: 'boolean', initialValue: false
    }),
  ],
});

export const FIELD_STAGES = {
  name: 'stages',
  type: 'stages',
};
