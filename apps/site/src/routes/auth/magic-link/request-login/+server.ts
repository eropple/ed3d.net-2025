// apps/site/src/routes/auth/magic-link/request-login/+server.ts
import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const logger = locals.logger.child({ route: "/auth/magic-link/request-login" });

  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString();
    // Read redirectPath from form data
    const redirectPath = formData.get("redirectPath")?.toString() || undefined;

    if (!email) {
      logger.warn("Email missing from request");
      return json({ success: false, message: "Email is required." }, { status: 400 });
    }

    // Basic email format validation (consider a more robust library if needed)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logger.warn("Invalid email format provided");
      return json({ success: false, message: "Please enter a valid email address." }, { status: 400 });
    }

    // Validate redirectPath (optional, basic check)
    if (redirectPath && !redirectPath.startsWith("/")) {
        logger.warn({ redirectPath }, "Invalid redirect path form parameter.");
        return json({ success: false, message: "Invalid redirect path provided." }, { status: 400 });
    }

    // Call the AuthService method, passing redirectPath
    await locals.deps.authService.requestLoginLink(email, redirectPath);

    // Log success - AuthService handles hashing internally now
    logger.info("Login link request processed");

    // Always return success to avoid revealing if an email exists
    return json({ success: true, message: "If an account exists for this email, a login link has been sent." });

  } catch (error) {
    logger.error({ err: error }, "Error requesting magic link");
    // Generic error message for the client
    return json({ success: false, message: "An error occurred. Please try again later." }, { status: 500 });
  }
};