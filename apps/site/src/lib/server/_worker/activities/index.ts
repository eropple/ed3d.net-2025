import { allSocialIdentityActivities } from "../../auth/social-identity/activities/index.js";
import { groupByTags } from "../../utils/data-structures.js";
import { type ExportedActivity } from "../activity-helpers.js";
// Import social identity activities

import { doPingActivity } from "./ping.js";

// TODO:  figure out how to break these out by queue type
//        it is relatively difficult to encode into the type system
//        that a given workflow is only allowed to enqueue some activities
//        and not others in its queue. it also might not be worth it.
export const ALL_ACTIVITIES: Array<ExportedActivity> = [
  doPingActivity,

  // Add social identity activities
  ...allSocialIdentityActivities,

  // core queue activities
];

// TODO: set up workers that can run activities by tag
export const ACTIVITIES_BY_TAGS = groupByTags(ALL_ACTIVITIES);
