FROM node:22-bookworm-slim AS deps

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy workspace root package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# Copy the specific app's package.json
COPY apps/site/package.json ./apps/site/

# Install dependencies for the entire workspace
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ---------------------------------------
FROM node:22-bookworm-slim AS development

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy dependencies from deps stage
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/site/node_modules ./apps/site/node_modules

# Copy workspace files
COPY . .

WORKDIR /workspace/apps/site

# Default development port (will be overridden by environment variables)
EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---------------------------------------
FROM node:22-bookworm-slim AS builder

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy dependencies and source
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/site/node_modules ./apps/site/node_modules
COPY . .

WORKDIR /workspace/apps/site

# Build the application
RUN pnpm build

# ---------------------------------------
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

RUN mkdir -p /workspace
WORKDIR /workspace/apps/site

# Copy built application and dependencies
COPY --from=builder /workspace/apps/site/build ./build
COPY --from=builder /workspace/apps/site/package.json ./package.json
COPY --from=deps /workspace/node_modules /workspace/node_modules
COPY --from=deps /workspace/apps/site/node_modules ./node_modules

# Create non-root user for security
RUN groupadd -r sveltekit && useradd -r -g sveltekit sveltekit
RUN chown -R sveltekit:sveltekit /workspace/apps/site
USER sveltekit

# Default production port (will be overridden by environment variables)
EXPOSE 3000

CMD ["node", "build/index.js"] 