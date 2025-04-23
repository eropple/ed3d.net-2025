import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'

import { colorInput } from "@sanity/color-input";

import {schemaTypes} from './schemas'
import { requireStr } from 'node-getenv';
import { groqdPlaygroundTool } from 'groqd-playground';

const config = defineConfig({
  name: 'default',
  title: 'ed3d CMS',

  projectId: "iqiyza0w",
  dataset: "production",

  plugins: [
    structureTool(),
    visionTool(),
    colorInput(),
    groqdPlaygroundTool({

    }),
  ],

  schema: {
    types: schemaTypes,
  },
})

export default config
