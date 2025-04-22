import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'

import { colorInput } from "@sanity/color-input";

import {schemaTypes} from './schemas'
import { requireStr } from 'node-getenv';
import { groqdPlaygroundTool } from 'groqd-playground';


export default defineConfig({
  name: 'default',
  title: 'ed3d CMS',

  projectId: requireStr('ED3D_CMS_PROJECT_ID'),
  dataset: requireStr('ED3D_CMS_DATASET'),

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
