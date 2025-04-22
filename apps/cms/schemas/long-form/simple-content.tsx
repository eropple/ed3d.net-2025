import React from 'react';
import { defineType, defineField } from 'sanity';

import {
  CENTERED_BLOCK_STYLE,
  LINK_ANNOTATION,
  NORMAL_BLOCK_STYLE,
  NORMAL_DECORATORS,
  NORMAL_LISTS,
} from './block-styles';

export const SimpleContent = defineType({
  title: 'Simple Content',
  name: 'simpleContent',
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
        // Annotations can be any object structure.
        annotations: [
          LINK_ANNOTATION,
        ],
      },
    },
  ],
});
