import { type Logger } from "pino";

export function validateAndGetRedirectUrl(
  logger: Logger,
  env: string,
  panelBaseUrl: string,
  providedRedirect?: string,
): string {
  if (env === "production") {
    throw new Error("TODO: Implement redirect validation in production");
  }

  const defaultRedirect = `${panelBaseUrl}/panel`;

  // TODO: Implement redirect validation in production
  // eslint-disable-next-line no-constant-condition
  if (true) {
    if (!providedRedirect) {
      return defaultRedirect;
    }

    // if providedRedirect is a relative URL, append it to panelBaseUrl
    if (providedRedirect?.startsWith("/")) {
      return `${panelBaseUrl}${providedRedirect}`;
    } else {
      return providedRedirect;
    }
  } else {
    logger.warn(
      { redirectTo: providedRedirect },
      "Invalid redirect URL in production, using default",
    );
    return defaultRedirect;
  }
}
