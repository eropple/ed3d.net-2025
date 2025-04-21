import { type FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import { type Logger } from "pino";

import { type SocialNormalizedUserInfo } from "../../schemas.js";

export interface OAuth2Provider {
  fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
    insecurelyLogOAuth2Payloads?: boolean,
  ): Promise<SocialNormalizedUserInfo | null>;
}

export abstract class BaseOAuth2Provider implements OAuth2Provider {
  abstract fetchUserInfo(
    logger: Logger,
    fetch: FetchFn,
    accessToken: string,
  ): Promise<SocialNormalizedUserInfo>;
}
