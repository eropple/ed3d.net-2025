import { redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";


export const load: PageServerLoad = async ({ locals }) => {
  const { user, deps, logger, config } = locals; // Added logger and config

  if (!user) {
    redirect(302, "/auth/login");
  }

  const { socialIdentityService } = deps; // Removed unused authService

  // --- Discord Guild Membership Check & CTA Data ---
  let showDiscordJoinCTA = false;
  let discordServerId: string | undefined = undefined;
  let discordInviteLink: string | undefined = undefined;

  const socialConfig = config.auth.socialIdentity;
  const isDiscordConfigured = !!socialConfig.discordServerId;

  if (isDiscordConfigured && socialConfig.discordServerId) {
    discordServerId = socialConfig.discordServerId;
    discordInviteLink = socialConfig.discordInviteLink;

    // Check if the user has connected Discord
    const socialIdentities = await socialIdentityService.getSocialIdentities(user);
    const discordIdentity = socialIdentities.find((id) => id.provider === "discord");

    if (discordIdentity) {
      // If connected, check membership
      if (discordIdentity.accessToken) {
        const isMember = await socialIdentityService.checkDiscordGuildMembership(
          discordIdentity.accessToken
        );
        if (!isMember) {
          showDiscordJoinCTA = true; // Show CTA if connected but not a member
        }
      } else {
        // If connected but no access token, something's wrong, show CTA?
        logger.warn({ userId: user.userId }, "Discord identity found but access token missing.");
        showDiscordJoinCTA = true; // Show CTA
      }
    } else {
      // If Discord is configured but user hasn't connected, show CTA
      showDiscordJoinCTA = true;
    }
  } else {
    logger.info("Discord integration not configured, skipping CTA check.");
  }


  return {
    showDiscordJoinCTA,
    discordServerId,
    discordInviteLink,
  };
};

export const actions: Actions = {};
