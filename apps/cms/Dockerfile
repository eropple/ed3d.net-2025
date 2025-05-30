FROM node:22-bookworm-slim AS deps

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy workspace root package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# Copy the specific app's package.json
COPY apps/cms/package.json ./apps/cms/

# Install dependencies for the entire workspace
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ---------------------------------------
FROM node:22-bookworm-slim AS development

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy dependencies from deps stage
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/cms/node_modules ./apps/cms/node_modules

# Copy workspace files
COPY . .

WORKDIR /workspace/apps/cms

EXPOSE 15333
CMD ["pnpm", "dev"]

# ---------------------------------------
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

RUN mkdir -p /workspace
WORKDIR /workspace

# Copy dependencies and built app
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/cms/node_modules ./apps/cms/node_modules
COPY . .

WORKDIR /workspace/apps/cms

# Build the Sanity studio
RUN pnpm build

EXPOSE 3333
CMD ["pnpm", "start"]
