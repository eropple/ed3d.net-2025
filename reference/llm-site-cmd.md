## Command Line Interface

The application provides a structured command-line interface built with `cmd-ts`, organized using a subcommands pattern.

### Architecture

- **Entry Point**: `apps/site/src/lib/server/_cli/entry-point.ts` - Verifies NODE_ENV is set and runs the CLI
- **Command Organization**: Commands are organized hierarchically with the `subcommands` function
- **Bootstrap Integration**: CLI commands use `bootstrapNode()` to access the application container

### Key Components

- **Root CLI**: Aggregates all top-level command groups
- **DB CLI**: Database-related commands (migrations)
- **Seed CLI**: Data seeding operations

### Environment Awareness

Commands respect the application's environment configuration:
- Default to current `NODE_ENV`
- Allow explicit environment override with `-e/--environment` flags (e.g., for seed commands)

### Extending the CLI

To add a new command:

1. **Create Command Module**:
```typescript
// filepath: apps/site/src/lib/server/_cli/example/my-command.ts
import { command } from "cmd-ts";
import { bootstrapNode } from "../../bootstrap/node.js";

export const myCommand = command({
    name: "my-command",
    args: {},  // Define arguments if needed
    handler: async (args) => {
    const { SINGLETON_CONTAINER, ROOT_LOGGER } = await bootstrapNode("my-command");
    
    // Access dependencies
    const { db, logger } = SINGLETON_CONTAINER.cradle;
    
    // Implementation
    logger.info("Running my command");
    
    // Clean up
    await SINGLETON_CONTAINER.dispose();
    process.exit(0);
    },
});
```

All commands have access to the full application container via `bootstrapNode()`, allowing them to:

- Connect to databases
- Use the logging system
- Access application configuration
- Utilize any registered service

You DO NOT have to use `bootstrapNode()` if your command doesn't actually need it. If you don't
need any services and can implement it just as a call to some pure functions or the like, do that
instead.

2. **Create Category Index** (if adding a new category):
```typescript
// filepath: apps/site/src/lib/server/_cli/example/index.ts
import { subcommands } from "cmd-ts";
import { myCommand } from "./my-command.js";

const subs = [myCommand].sort((a, b) => a.name.localeCompare(b.name));

export const EXAMPLE_CLI = subcommands({
  name: "example",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
```

3. **Register in Root CLI:**

```ts
// filepath: apps/site/src/lib/server/_cli/index.ts
import { subcommands } from "cmd-ts";

import { DB_CLI } from "./db/index.js";
import { SEED_CLI } from "./seed/index.js";
import { EXAMPLE_CLI } from "./example/index.js";

const subs = [
  SEED_CLI,
  DB_CLI,
  EXAMPLE_CLI,
].sort((a, b) => a.name.localeCompare(b.name));

export const ROOT_CLI = subcommands({
  name: "app-cli",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
```