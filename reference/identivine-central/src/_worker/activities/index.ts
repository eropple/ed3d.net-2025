import { groupByTags } from "@myapp/shared-universal/utils/data-structures.js";

import { ATPROTO_IDENTITY_ACTIVITIES } from "../../domain/atproto/activities/index.js";
import { IMAGE_ACTIVITIES } from "../../domain/images/activities/index.js";
import { MASTODON_IDENTITY_ACTIVITIES } from "../../domain/mastodon/activities/index.js";
import { SITE_IDENTITY_ACTIVITIES } from "../../domain/sites/activities/identity/index.js";
import { SOCIAL_IDENTITY_ACTIVITIES } from "../../domain/social-identity/activities/identity/index.js";
import { WEB_IDENTITY_ACTIVITIES } from "../../domain/web-identity/activities/index.js";
import { type ExportedActivity } from "../activity-helpers.js";

import { doPingActivity } from "./ping.js";

// TODO:  figure out how to break these out by queue type
//        it is relatively difficult to encode into the type system
//        that a given workflow is only allowed to enqueue some activities
//        and not others in its queue. it also might not be worth it.
export const ALL_ACTIVITIES: Array<ExportedActivity> = [
  doPingActivity,

  // core queue activities
  // media queue activities
  ...IMAGE_ACTIVITIES,
  // social-identity queue activities
  ...SITE_IDENTITY_ACTIVITIES,
  ...SOCIAL_IDENTITY_ACTIVITIES,
  ...ATPROTO_IDENTITY_ACTIVITIES,
  ...MASTODON_IDENTITY_ACTIVITIES,
  ...WEB_IDENTITY_ACTIVITIES,
  // atproto queue activities
];

// TODO: set up workers that can run activities by tag
export const ACTIVITIES_BY_TAGS = groupByTags(ALL_ACTIVITIES);
