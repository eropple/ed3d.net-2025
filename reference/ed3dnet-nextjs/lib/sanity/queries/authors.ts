import { q } from "../client";

export const authorProjection = q
  .fragmentForType<"author">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
    fullName: sub.field("fullName"),
    shortName: sub.field("shortName"),
    email: sub.field("email"),
    url: sub.field("url"),

    avatar: sub
      .field("avatar")
      .field("asset")
      .deref()
      .project((sub2) => ({
        altText: sub2.field("altText"),
        url: sub2.field("url"),
      })),
  }));
