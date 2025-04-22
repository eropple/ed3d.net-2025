import { defineType, defineField } from 'sanity';

export const PodcastAudioClip = defineType({
  name: 'podcastAudioClip',
  title: 'Podcast / Audio Clip',
  type: 'document',
  fields: [
    defineField({
      name: 'title', type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'clip',
      type: 'file',
      options: {
        storeOriginalFilename: false,
        accept: 'audio/*',
      },
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ]
});
