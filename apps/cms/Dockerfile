FROM node:20-bookworm-slim AS deps

RUN echo 3
RUN mkdir -p /app
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# ---------------------------------------
FROM node:20-bookworm-slim AS development

RUN mkdir -p /app
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 15333
CMD ["yarn", "exec", "--", "sanity", "dev"]

# ---------------------------------------
FROM node:20-bookworm-slim AS production

ENV NEXT_TELEMETRY_DISABLED 1

RUN mkdir -p /app
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn exec sanity build

EXPOSE 3333
CMD ["yarn", "exec", "--", "sanity", "start"]
