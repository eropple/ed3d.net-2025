import React from 'react';
import { defineType, defineField } from 'sanity';

import { FaRegImage as imageIcon } from 'react-icons/fa';
import { FaRegCaretSquareUp as footnoteIcon } from 'react-icons/fa';

import {
  CENTERED_BLOCK_STYLE,
  H2_BLOCK_STYLE,
  H3_BLOCK_STYLE,
  LINK_ANNOTATION,
  NORMAL_BLOCK_STYLE,
  NORMAL_DECORATORS,
  NORMAL_LISTS,
} from './block-styles';

export const LongFormBlockContent = defineType({
  title: 'Block Content',
  name: 'longFormBlockContent',
  type: 'array',
  of: [
    {
      title: 'Block',
      type: 'block',
      // Styles let you set what your user can mark up blocks with. These
      // corrensponds with HTML tags, but you can set any title or value
      // you want and decide how you want to deal with it where you want to
      // use your content.
      styles: [
        NORMAL_BLOCK_STYLE,
        H2_BLOCK_STYLE,
        H3_BLOCK_STYLE,
        CENTERED_BLOCK_STYLE,
      ],
      lists: [
        ...NORMAL_LISTS,
      ],
      // Marks let you mark up inline text in the block editor.
      marks: {
        // Decorators usually describe a single property – e.g. a typographic
        // preference or highlighting by editors.
        decorators: [
          ...NORMAL_DECORATORS,
        ],
        // Annotations can be any object structure – e.g. a link or a footnote.
        annotations: [
          LINK_ANNOTATION,
          {
            name: 'sidenote',
            type: 'object',
            title: 'Sidenote',
            icon: footnoteIcon,
            fields: [
              {
                title: 'Markdown',
                name: 'markdown',
                type: 'string',
              },
            ],
          },
        ],
      },
    },
    {
      type: 'imageWithAlt',
      icon: imageIcon,
    },
    {
      type: 'blockQuote',
      name: 'blockQuote',
    },
    {
      type: 'epigraph',
      name: 'epigraph',
    },
    {
      name: 'divider',
      type: 'divider',
    },
    // {
    //   type: 'codeBlock',
    // },
    {
      name: 'youtubeEmbed',
      type: 'youtubeEmbed',
    },
  ],
});
