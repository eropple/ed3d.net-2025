import {defineCliConfig} from 'sanity/cli'
import { requireStr } from "node-getenv";

export default defineCliConfig({
  api: {
    projectId: requireStr('ED3D_CMS_PROJECT_ID'),
    dataset: requireStr('ED3D_CMS_DATASET'),
  }
})
