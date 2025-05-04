import { fail, isRedirect, redirect } from "@sveltejs/kit";
import { redirect as flashRedirect } from "sveltekit-flash-message/server"; // Import flashRedirect

import type { Actions, PageServerLoad } from "./$types";

import { AUTH_METHODS } from "$lib/components/UserWidget/constants.js"; // Import AUTH_METHODS
import type { UserPrivate } from "$lib/domain/users/types.js";
import type { StringUUID } from "$lib/ext/typebox/index.js"; // Import StringUUID
import type { SocialOAuth2ProviderKind } from "$lib/server/db/schema"; // Import the type

// Temporary helper map - ideally expose from AuthService or a shared constant
const providerDisplayNames: Record<SocialOAuth2ProviderKind, string> = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
};

// Load user connections for the profile page
export const load: PageServerLoad = async ({ locals }) => {
  const { user, deps } = locals;
  const { authService, socialIdentityService, config } = deps;

  if (!user) {
    redirect(302, "/login");
  }

  const connections = await authService.getUserConnections(user);
  const missingConnections = await authService.getMissingConnections(user);

  // --- Discord Guild Membership Check & CTA Data ---
  let showDiscordJoinCTA = false;
  let discordServerId: string | undefined = undefined;
  let discordInviteLink: string | undefined = undefined;

  const socialConfig = config.auth.socialIdentity;
  const isDiscordConfigured = !!socialConfig.discordServerId;

  if (isDiscordConfigured && socialConfig.discordServerId) {
    discordServerId = socialConfig.discordServerId;
    discordInviteLink = socialConfig.discordInviteLink;

    const discordConnection = connections.social.find(
      (conn) => conn.provider === "discord"
    );

    if (discordConnection) {
      const socialIdentities = await socialIdentityService.getSocialIdentities(user);
      const discordIdentity = socialIdentities.find(id => id.provider === "discord");

      if (discordIdentity?.accessToken) {
        const isMember = await socialIdentityService.checkDiscordGuildMembership(
          discordIdentity.accessToken
        );
        if (!isMember) {
          showDiscordJoinCTA = true;
        }
      } else {
        locals.logger.warn({ userId: user.userId }, "Discord connection found but identity or access token missing.");
        showDiscordJoinCTA = true;
      }
    } else {
      showDiscordJoinCTA = true;
    }
  }

  // Create a map of provider IDs to display names for missing connections
  const providerNameMap: Partial<Record<SocialOAuth2ProviderKind, string>> = {};
  for (const providerId of missingConnections.social) {
    providerNameMap[providerId] = providerDisplayNames[providerId] || providerId;
  }

  // Prepare data for the page
  return {
    user: locals.user,
    connections: {
      social: connections.social,
    },
    missingConnections: {
      social: missingConnections.social,
    },
    providerNameMap,
    ...(showDiscordJoinCTA && {
      showDiscordJoinCTA: true,
      discordServerId: discordServerId,
      discordInviteLink: discordInviteLink
    })
  };
};

export const actions: Actions = {
  // Update email action
  updateEmail: async ({ request, locals }) => {
    const logger = locals.logger.child({ action: "/profile:updateEmail" });
    if (!locals.user) {
      return fail(401, { formName: "updateEmail", success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();
    const email = formData.get("email")?.toString();

    if (!email) {
      return fail(400, { formName: "updateEmail", success: false, message: "Email is required" });
    }

    try {
      await locals.deps.authService.startEmailChangeVerification(locals.user.userId, email);
      return { success: true };
    } catch (error) {
      logger.error({ err: error }, "Error starting email update verification");
      return fail(500, {
        formName: "updateEmail",
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  },

  // Remove social connection action
  removeConnection: async ({ request, locals, cookies }) => {
    const logger = locals.logger.child({ action: "/profile:removeConnection" });
    if (!locals.user) {
      return fail(401, { formName: "removeConnection", success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();
    const identityUuid = formData.get("identityUuid")?.toString() as StringUUID | undefined;

    if (!identityUuid) {
      logger.warn("Missing identityUuid in removeConnection request");
      return fail(400, { formName: "removeConnection", success: false, message: "Missing connection identifier" });
    }

    try {
      logger.debug({ userId: locals.user.userId, identityUuid }, "Attempting to remove social identity");
      const connections = await locals.deps.authService.getUserConnections(locals.user.userId);
      const connectionToRemove = connections.social.find(c => c.identityUuid === identityUuid);
      const providerName = connectionToRemove?.providerName || "Account";

      await locals.deps.authService.removeSocialIdentity(locals.user.userId, identityUuid);
      logger.info({ userId: locals.user.userId, identityUuid }, "Successfully removed social identity");

      throw flashRedirect(
        303,
        "/profile",
        { type: "success", message: `${providerName} disconnected successfully.` },
        cookies
      );

    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }

      logger.error({ err: error, userId: locals.user.userId, identityUuid }, "Error removing social identity");
      return fail(500, {
        formName: "removeConnection",
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred while removing the connection"
      });
    }
  },

  // Update username action
  updateUsername: async ({ request, locals, cookies }) => {
    const logger = locals.logger.child({ action: "/profile:updateUsername" });
    if (!locals.user) {
      return fail(401, { formName: "updateUsername", success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();
    const username = formData.get("username")?.toString();

    if (!username) {
      return fail(400, { formName: "updateUsername", success: false, message: "Username is required", username: "" });
    }

    const trimmedUsername = username.trim();

    try {
      logger.debug({ userId: locals.user.userId, requestedUsername: trimmedUsername }, "Attempting to update username via action.");
      const updatedUser = await locals.deps.users.updateUsername(locals.user.userId, trimmedUsername);
      logger.info({ userId: locals.user.userId, newUsername: updatedUser.username }, "Username updated successfully via action.");

      throw flashRedirect(
        303,
        "/profile",
        { type: "success", message: `Username updated to ${updatedUser.username} successfully.` },
        cookies
      );

    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }

      logger.warn({ err: error, userId: locals.user.userId, requestedUsername: trimmedUsername }, "Error updating username via action.");
      const message = error instanceof Error ? error.message : "An unknown error occurred while updating the username.";
      return fail(400, {
        formName: "updateUsername",
        success: false,
        message: message,
        username: trimmedUsername
      });
    }
  }
};
