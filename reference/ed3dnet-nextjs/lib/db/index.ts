import { drizzle } from "drizzle-orm/node-postgres";

import { CONFIG } from "../config";

import * as schema from "./schema";

export const db = drizzle(CONFIG().POSTGRES_URL, { schema });
