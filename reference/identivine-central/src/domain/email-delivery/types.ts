export type EnqueueEmailInput = {
  target: {
    /**
     * unsubcribing your email, when you've received a post newsletter, is
     * at the creator level; the feed IDs themselves don't matter.
     */
    kind: "post-newsletter";
    creatorId: string;
    userProfileId: string;
  };
  templateName: string;
  args: Record<string, unknown>;
};
