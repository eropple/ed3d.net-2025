#! /bin/sh

# -- shared/global stuff
export NODE_ENV=development

# -- tiltfile stuff, you might need to change these
#    when working on things that have to scale up/down
export TILT_RUNMODE=dev-in-tilt
export TILT_NAMESPACE="creatrix-dev"
export TILT_PORT_PREFIX=420
export TILT_PORT="${TILT_PORT_PREFIX}99"

# the labeler doesn't use many resources but does require
# setting up cloudflared correctly, an identity, etc.
# set to 1 to run it, anything else to skip.
export TILT_RUN_LABELER=1

# this can be pretty high-volume, so if you aren't testing
# ingest and labeling, you may want to skip by setting this
# to something other than 1.
export TILT_RUN_JETSTREAMER=1

# these map to the different temporal queues. set to 0
# to run no workers for those queues.
export TILT_WORKER_CORE_COUNT=1
export TILT_WORKER_IDENTITY_COUNT=1
export TILT_WORKER_ATPROTO_COUNT=4
export TILT_WORKER_MEDIA_COUNT=1

# -- object store (s3)
export S3_BASE_URL="https://somelocalreplacement"

# -- site-tenant (user content server) stuff
export TENANT_PORT="${TILT_PORT_PREFIX}02"
# this is communicated with the backend server after being run through SHA512/256
# twice, so for testing via curl etc., pass "235c533e76ce9e584016d00075d6e84a654a7316f77c6b06237f714f75142700"
export TENANT_PUBLIC_ACCESS_KEY="thisisasecret"

# -- site-panel (control panel, logins, etc.) stuff
export PANEL_PORT="${TILT_PORT_PREFIX}03"
export PANEL_PRE_SHARED_KEY="thisisasecret"
export PANEL_INSECURE_COOKIES=false

export PANEL_BASE_URL="http://somelocalreplacement:${PANEL_PORT}"
export PANEL_API_BASE_URL="http://somelocalreplacement:${CENTRAL_HTTP__PORT}"
export PANEL_S3_BASE_URL="${S3_BASE_URL}"

# -- central (main server) stuff
# !!! STUFF YOU MUST CHANGE !!! #
export CENTRAL_MASTODON__APP_NAME="CHANGEMECHANGEMECHANGEME"

export CENTRAL_ATPROTO__CLIENT_NAME="CHANGEMECHANGEMECHANGEME"

export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_ID=xxx
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_SECRET=xxx
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GITLAB_CLIENT_ID=yyy
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GITLAB_CLIENT_SECRET=zzz
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__THREADS__CLIENT_ID="234234"
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__THREADS__CLIENT_SECRET="123464345673"
# https://developers.tiktok.com/
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__TIKTOK__CLIENT_ID="123123"
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__TIKTOK__CLIENT_SECRET="1231231231231"
# https://console.cloud.google.com/apis/credentials
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_ID="aaaaaaaa"
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_SECRET="bbbbbbbbbb"
# https://dev.twitch.tv/console/apps
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__TWITCH__CLIENT_ID="3456734578"
export CENTRAL_SOCIAL_IDENTITY__PROVIDERS__TWITCH__CLIENT_SECRET="34563456345"

export CENTRAL_ATPROTO_LABELER__LABELER_NAME=xxxxxxxxx
export CENTRAL_ATPROTO_LABELER__LABEL_PREFIX="idv-xyz"
export CENTRAL_ATPROTO_LABELER__DOMAIN="xxx"
export CENTRAL_ATPROTO_LABELER__DID=did:plc:xxxxx
# run `pnpm run:dev pnpm cli:dev  labeler setup --generate-new-private-key` to get this
export CENTRAL_ATPROTO_LABELER__SIGNING_KEY=xxxxx

# !!! STUFF YOU MUST CHANGE (IS UP THERE!) !!! #

export CENTRAL_ATPROTO_LABELER__PRE_SHARED_KEY="secretsecretsecret"
export CENTRAL_ATPROTO_LABELER_CONSUMER__PRE_SHARED_KEY=${CENTRAL_ATPROTO_LABELER__PRE_SHARED_KEY}
export CENTRAL_ATPROTO_LABELER_CONSUMER__DID=${CENTRAL_ATPROTO_LABELER__DID}
export CENTRAL_ATPROTO_LABELER_CONSUMER__DOMAIN=${CENTRAL_ATPROTO_LABELER__DOMAIN}

# when working with identities, set this to true.
export CENTRAL_INSECURE_OPTIONS__INSECURELY_LOG_OAUTH2_PAYLOADS="true"

# stuff below this probably doesn't change much
export CENTRAL_HTTP__PORT="${TILT_PORT_PREFIX}01"
export CENTRAL_HTTP__LOG_LEVEL="debug"

export CENTRAL_LABELER__HTTP__PORT="${TILT_PORT_PREFIX}04"
export CENTRAL_LABELER__HTTP__LOG_LEVEL="debug"

export CENTRAL_LOG_LEVEL="debug"
export CENTRAL_PRETTY_LOGS=true

export CENTRAL_MEMORY_SWR__LOG_SWR_EVENTS=true

export CENTRAL_S3__FLAVOR="minio"
export CENTRAL_S3__ENDPOINT="localhost:${TILT_PORT_PREFIX}40"
export CENTRAL_S3__PORT="${TILT_PORT_PREFIX}40"
export CENTRAL_S3__SSL=true
export CENTRAL_S3__ACCESS_KEY="miniominio"
export CENTRAL_S3__SECRET_KEY="miniominio"
export CENTRAL_S3__BUCKETS__CORE="core"
export CENTRAL_S3__BUCKETS__USER_PUBLIC_CONTENT="user-public-content"
export CENTRAL_S3__BUCKETS__USER_SIGNED_ACCESS="user-signed-access"
export CENTRAL_S3__BUCKETS__UPLOAD_STAGING="upload-staging"

export CENTRAL_URLS__PANEL_BASE_URL="${PANEL_BASE_URL}"
export CENTRAL_URLS__API_BASE_URL="${PANEL_API_BASE_URL}"
export CENTRAL_URLS__S3_BASE_URL="${PANEL_S3_BASE_URL}"
export CENTRAL_URLS__S3_EXTERNAL_URL="${PANEL_S3_BASE_URL}"

export CENTRAL_HTTP__EMIT_STACK_ON_ERRORS=true

export CENTRAL_POSTGRES__READONLY__HOST="localhost"
export CENTRAL_POSTGRES__READONLY__PORT="${TILT_PORT_PREFIX}20"
export CENTRAL_POSTGRES__READONLY__USER="postgres"
export CENTRAL_POSTGRES__READONLY__PASSWORD="postgres"
export CENTRAL_POSTGRES__READONLY__DATABASE="postgres"
export CENTRAL_POSTGRES__READONLY__SSL=false

export CENTRAL_POSTGRES__READONLY__URL="postgres://${CENTRAL_POSTGRES__READONLY__USER}:${CENTRAL_POSTGRES__READONLY__PASSWORD}@${CENTRAL_POSTGRES__READONLY__HOST}:${CENTRAL_POSTGRES__READONLY__PORT}/${CENTRAL_POSTGRES__READONLY__DATABASE}"

export CENTRAL_POSTGRES__READWRITE__HOST="localhost"
export CENTRAL_POSTGRES__READWRITE__PORT="${TILT_PORT_PREFIX}20"
export CENTRAL_POSTGRES__READWRITE__USER="postgres"
export CENTRAL_POSTGRES__READWRITE__PASSWORD="postgres"
export CENTRAL_POSTGRES__READWRITE__DATABASE="postgres"
export CENTRAL_POSTGRES__READWRITE__SSL=false

export CENTRAL_POSTGRES__READWRITE__URL="postgres://${CENTRAL_POSTGRES__READWRITE__USER}:${CENTRAL_POSTGRES__READWRITE__PASSWORD}@${CENTRAL_POSTGRES__READWRITE__HOST}:${CENTRAL_POSTGRES__READWRITE__PORT}/${CENTRAL_POSTGRES__READWRITE__DATABASE}"

# these are dev keys so they can be saved in the dev sample
export CENTRAL_VAULT__PRIMARY_KEY="aes256-gcm:9845530:QsEWhKrLSeOYst/kj371t+XSymFrPRiRHtykuvfY8iE="
export CENTRAL_VAULT__LEGACY_KEYS="aes256-gcm:3495203:oZtRmyAFq+Z//arYwGR0NajxhdIyE4UQQKKEqxAMtYk=,aes256-gcm:8620318:oNMOJvAw3+ssWao8zi0G0SxSWradCykOHAphxKq6ZEo="

export CENTRAL_REDIS__URL="redis://localhost:${TILT_PORT_PREFIX}10"

export CENTRAL_TEMPORAL__ADDRESS="localhost:${TILT_PORT_PREFIX}30"
export CENTRAL_TEMPORAL__NAMESPACE="default"
export CENTRAL_TEMPORAL__QUEUES__CORE="core"
export CENTRAL_TEMPORAL__QUEUES__IDENTITY="identity"
export CENTRAL_TEMPORAL__QUEUES__MEDIA="media"
export CENTRAL_TEMPORAL__QUEUES__ATPROTO="atproto"

export CENTRAL_INTEROP__TENANT_PRE_SHARED_KEY=thisisasecret
export CENTRAL_INTEROP__PANEL_PRE_SHARED_KEY=thisisasecret

export CENTRAL_SOCIAL_IDENTITY__STATE_KEY_PAIR__KEY="k3.local.9g_2n4CasqgE9_U5kJodSjW9VWFTxqDWwveZQJw2pPc"
export CENTRAL_MASTODON__STATE_KEY_PAIR__KEY="k3.local.9g_2n4CasqgE9_U5kJodSjW9VWFTxqDWwveZQJw2pPc"

export CENTRAL_ATPROTO__CURRENT_KID=identitree-dev-atproto-client-01
export CENTRAL_ATPROTO__JWKS='{"keys": [{"kty": "EC","d": "POpbvJk7_-grHVgLn11qW3tvT6glUQ5HCeu8Fo5t36I","use": "sig","crv": "P-256","kid": "identitree-dev-atproto-client-01","x": "5KW5nRW1CbiBKJWhst-EEQg7OZ2ToWGLiC4ZrxwzocQ","y": "Ee2RUUDyQrCKFTLctYZyORfC-SBhoBA0O0ajtYqRptc","alg": "ES256"}]}'

export CENTRAL_USERS__AUTH__ACCESS_TOKEN_KEY_PAIR__SECRET_KEY="k4.secret.oUwmRJInBm0J-LAZo7DwS4e6YXdaa_LPHWt3BKBv4aVu-66JiNkb-Yihh6ouClpKXPoAWFYKF8ngi8qocvvywg"
export CENTRAL_USERS__AUTH__ACCESS_TOKEN_KEY_PAIR__PUBLIC_KEY="k4.public.bvuuiYjZG_mIoYeqLgpaSlz6AFhWChfJ4IvKqHL78sI"

export CENTRAL_USERS__AUTH__OAUTH2_STATE_KEY_PAIR__SECRET_KEY="k4.secret.lvmq7pDO4U0QaoR_BTCfaVIS-ZgNZ49_EGtXWVM5pbzjoF-Dd9LtqmOCKd_7eEt2YE0jOYmN1m7NFkrq6DN3wA"
export CENTRAL_USERS__AUTH__OAUTH2_STATE_KEY_PAIR__PUBLIC_KEY="k4.public.46Bfg3fS7apjginf-3hLdmBNIzmJjdZuzRZK6ugzd8A"

export CENTRAL_INSECURE_OPTIONS__SKIP_PASSWORD_STRENGTH_CHECK="true"


# The following variables are not used in the provided config loader,
# but I'm keeping them here in case they're needed elsewhere:

# export CENTRAL_SMTP_HOST="localhost"
# export CENTRAL_SMTP_PORT="${TILT_PORT_PREFIX}25"
# export CENTRAL_SMTP_USER="localdevsmtp"
# export CENTRAL_SMTP_PASSWORD="localdevsmtp"
# export CENTRAL_SMTP_TLS="false"
# export CENTRAL_SMTP_FROM="Ed from Local Dev <hello@mail.ed3d.net>"
# export CENTRAL_SMTP_REPLY_TO="Ed <ed+mailreply@ed3d.net>"