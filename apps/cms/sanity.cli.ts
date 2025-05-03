import {defineCliConfig} from 'sanity/cli'
import { requireStr } from "node-getenv";

console.log(Object.entries(process.env).filter(([key]) => key.startsWith('ED3D_CMS_')));

export default defineCliConfig({
  api: {
    projectId: "iqiyza0w",
    dataset: "production",
  }
})
