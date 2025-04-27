# Ed3d.net Application Architecture Reference

## Core Architecture
- **Framework**: SvelteKit (Svelte 5.x) with TypeScript
- **Structure**: Monorepo with main site in `apps/site`
- **Development Pattern**: Server/client components with SvelteKit conventions

## Dependency Injection
The application uses Awilix for dependency injection with two primary scopes:
- **Singleton Scope**: Application-wide services configured in `_deps/scopes/singleton.ts`
- **Request Scope**: Per-request dependencies configured in `_deps/scopes/request.ts`

## Key Services

### Database
The database is for user objects and the like. Content comes in via Sanity.

```typescript
// Read-only and read-write pools with separate configuration
dbROPool: pg.Pool  // Read-only connection pool
dbPool: pg.Pool    // Read-write connection pool

// Drizzle ORM instances for each pool
dbRO: DrizzleRO    // Read-only operations
db: Drizzle        // Read-write operations
```

### Caching
```typescript
// In-memory SWR (Stale-While-Revalidate) cache
memorySWR: StaleWhileRevalidate
```

### Background Processing
```typescript
// Temporal workflow client and service
temporalClient: TemporalClient
temporal: TemporalClientService
```

### HTTP Client
```typescript
// Wrapped fetch with logging
fetch: FetchFn
```

### Configuration & Logging
```typescript
// Application configuration
config: DeepReadonly<AppConfig>

// Structured logger
logger: Logger
```

## Request Lifecycle
1. Request enters via SvelteKit hooks (`hooks.server.ts`)
3. Request-scoped container is initialized
4. Dependencies are attached to `event.locals`
5. Route handler executes with access to injected dependencies
6. Response is returned with timing and status information logged

## Configuration System
- Environment-based configuration loading
- Type-safe configuration interface with `AppConfig`
- Configuration passed to all components via DI container

## Observability
- Pino for structured JSON logging
  - ALWAYS use `err` for the error in a catch as Pino will log the error automatically
- Request-scoped logging with correlation IDs
- Component-specific loggers with configurable log levels
- Complete request lifecycle timing and error tracking

## Development Considerations

### Adding New Dependencies
New dependencies should be registered in the appropriate container:
- Application-wide services in `configureBaseAwilixContainer()`
- Request-scoped services in `configureRequestScope()`

### Database Access Pattern
- Use `dbRO` for read operations to leverage database replicas
- Use `db` only for write operations
- All database access is through Drizzle ORM
- All models (types declared via `.$inferSelect`) should begin with `DB`.

### Background Tasks
Long-running or reliability-critical tasks should use Temporal workflows instead of simple background jobs or cron tasks.

### Error Handling
All errors are automatically logged with request context. Unhandled errors are captured in `hooks.server.ts` and logged with appropriate context.

## Routes
All SvelteKit routes, unless explicitly ordered otherwise, should have server-side logic only, e.g. `+page.server.ts` and `+layout.server.ts`.

## Services
Services own database resources. For example, `UserService` owns the `user` table.

## Service Object Types

Services define externally returnable objects (DTOs) with the following rules:

- Services should NEVER return database models (like `DBUser`) from public methods
- Each service's DTOs should be defined as TypeBox objects in a `types.ts` (or a `types/index.ts` file with related files) file alongside the service
- Each service object should have a `__type` field with a literal value matching the object type (e.g., `__type: "UserPublic"`)
- Try to build them via composition rather than copying whenever possible, for example:
- Services that consume other services' DAOs, or non-getter methods in a service that owns a DAO, should accept either the DAO or its primary ID as an argument. For example, `AuthService` should accept `UserPrivate` (the entire returned object from `UserService.getById`, containing ` userId: UserIds.TRichId`) or `UserId` (the primary ID of the user). 

```ts
export const UserPublic = Type.Object({
  __type: Type.Literal("UserPublic"),
  userId: UserIds.TRichId,
});

export const UserPrivate = Type.Composite([
  Type.Omit(UserPublic, ["__type"]),
  Type.Object({
    __type: Type.Literal("UserPrivate"),
    email: Type.String({ format: "email" }),
  })
]);
```

- Service objects using rich IDs should have the appropriate rich ID type from `ids.ts` 
- Services should provide methods to convert between public and private representations:
  - `toPublic(privateObject)` to reduce a private object to its public representation
  - Database objects should be converted to DTOs before being returned from service methods
- Avatars should use Gravatar URLs based on the user's email rather than stored URLs

## Working in Svelte

- Components that are specific to a route should live next to the +layout.svelte or +page.svelte files that they relate to. Reusable components should go in the `src/lib/components` directory.
- Use Tailwind CSS whenever possible instead of custom CSS.
- When in the workshop (control panel, routes under `/workshop`), use DaisyUI components.
- In page/layout loaders, you can determine if a user is logged in by checking `locals.user`. If they are not logged in, you can redirect them to the login page by throwing a redirect exception:

```ts
throw redirect(302, "/login");
```

## The Workshop
Our backend for managing the website is called the "Workshop". It is part of the main application and is accessible at `/workshop`.

You can find our LLM notes about this at `llm-site-workshop.md`.