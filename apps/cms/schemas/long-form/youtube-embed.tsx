import { IoLogoYoutube as icon } from 'react-icons/io'
import { defineField, defineType } from 'sanity';

export const YouTubeEmbed = defineType({
  name: 'youtubeEmbed',
  title: 'YouTube',
  type: 'object',
  icon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      description: 'The title of this video',
      type: 'string'
    }),
    defineField({
      name: 'youtubeId',
      title: 'YouTube ID',
      description:
        'Find it in the url after /embed: https://www.youtube.com/embed/[:youtubeId]',
      type: 'string',
      // @ts-ignore
      codegen: { required: true },
      validation: Rule => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      youtubeId: 'youtubeId',
    },
    prepare(selection) {
      const { title, youtubeId } = selection
      return {
        title: title || youtubeId,
      }
    },
  },
});
