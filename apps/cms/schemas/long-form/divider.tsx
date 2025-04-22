import React from 'react'
import { FiMinus as icon } from 'react-icons/fi'

import { defineType, defineField } from 'sanity';

export const Divider = defineType({
  name: 'divider',
  title: 'Divider',
  type: 'object',
  icon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
  ],
  preview: {
    select: {},
    prepare() {
      return {
        title: 'Section Break',
      }
    }
  },
});
