import { toHTML } from "@portabletext/to-html";
import { stripIndent } from "common-tags";
import { toXML } from "jstoxml";
import { sortBy } from "lodash";
import xmlFormat from "xml-formatter";

import { SITE_NAME, THEME_COLOR } from "../../constants";
import { reverseTitleize } from "../../presentation";
import { type BlogContent } from "../../sanity/queries/blogs/list";

export type BlogFeedGenerationOptions = {
  mainBaseUrl: string;
  method: "brief" | "full";
};

function makePostDescription(
  blog: BlogContent,
  options: BlogFeedGenerationOptions,
): string {
  const postUrl = `${options.mainBaseUrl}/blog/${blog.slug}`;

  const blocks = options.method === "brief" ? blog.body.slice(0, 3) : blog.body;

  const html = toHTML(blocks, {});
  const footer =
    options.method === "brief"
      ? `<p>&mdash;</p><p><em><a href="${postUrl}">read more on ed3d.net...</a></em></p>`
      : "";

  let tagText = "";

  if (blog.tags && blog.tags.length > 0) {
    tagText = `<br /><strong>Tags:</strong> ${blog.tags.map((t) => t.slug).join(", ")}`;
  }

  const desc = stripIndent`
    <p>
      <em>${blog.blurb}</em>
    </p>
    <p>
      <strong>Category:</strong> ${blog.category ?? "Uncategorized"}
      ${tagText}
    </p>
    <p>
      &mdash;
    </p>
    ${html}
    ${footer}
  `;

  // TODO: when we implement entitlements, we'll need to do this
  // if ((blog.entitlements ?? []).length > 0) {
  //   desc += stripIndent`
  //     <p>
  //       <em>This is a subscriber-only post.</em> If you'd like to support
  //       the site, please visit <a href="${MAIN_BASE_URL}/shop">the shop</a>
  //       for a subscription.
  //     </p>
  //   `;
  // }

  return desc.replace("\n", "");
}

export async function buildBlogFeed(
  allPosts: ReadonlyArray<BlogContent>,
  options: BlogFeedGenerationOptions,
): Promise<string> {
  allPosts = sortBy(allPosts, (p) => p.date).reverse();
  const currentPosts = allPosts.filter((p) => new Date(p.date) < new Date());

  const currentYear = new Date().getFullYear();

  const blogUrl = `${options.mainBaseUrl}/blog`;
  const blogDescription = stripIndent`
      The blog feed for ${SITE_NAME}. If this were 2004, we'd say something funny
      here. "All the news that's fit to print!", maybe. But this is a blog, this
      is self-indulgence and not news. But you're more than welcome to hang out if
      that's your bag.

      (This feed is text-only; please visit the site for podcast feeds.)
  `.replace("\n", "");

  const title = reverseTitleize("Blog");

  const blogRssPngUrl = `${options.mainBaseUrl}/images/feeds/the-blog-rss.png`;
  const blogRssSvgUrl = `${options.mainBaseUrl}/images/square-logo.svg`;

  const rss = {
    _name: "rss",
    _attrs: {
      version: "2.0",
      "xmlns:webfeeds": "http://webfeeds.org/rss/1.0",
      "xmlns:atom": "http://www.w3.org/2005/Atom",
    },
    _content: {
      channel: [
        {
          _name: "atom:link",
          _attrs: {
            rel: "self",
            href: `${options.mainBaseUrl}/blog/feed.rss`,
          },
        },
        { link: blogUrl },
        { title },
        { description: blogDescription },
        { language: "en-US" },
        { generator: SITE_NAME },
        { managingEditor: `ed+ed3d-blog@edropple.com (Ed Ropple)` },
        { webMaster: `ed+ed3d-blog@edropple.com (Ed Ropple)` },
        { category: "Blog" },
        {
          image: {
            url: blogRssPngUrl,
            title,
            link: blogUrl,
            width: 144,
            height: 144,
          },
        },
        {
          _name: "webfeeds:cover",
          _attrs: {
            image: blogRssPngUrl,
          },
        },
        { "webfeeds:icon": blogRssSvgUrl },
        { "webfeeds:accentColor": THEME_COLOR.replace("#", "") },
        {
          _name: "webfeeds:related",
          _attrs: {
            layout: "card",
            target: "browser",
          },
        },
        {
          copyright: `(C) 2022-${currentYear} Ed Ropple and contributors; all rights reserved.`,
        },
        { docs: "https://validator.w3.org/feed/docs/rss2.html" },
        { lastBuildDate: () => new Date().toUTCString() },
        {
          pubDate: () => {
            const latestBlog = currentPosts[0];
            return latestBlog
              ? new Date(latestBlog.date).toUTCString()
              : new Date().toUTCString();
          },
        },
        { ttl: 60 },
        ...currentPosts.map((post) => ({
          item: [
            { title: post.title },
            { link: [options.mainBaseUrl, `/blog/${post.slug}`].join("") },
            {
              _name: "guid",
              _attrs: {
                isPermaLink: false,
              },
              _content: post.slug,
            },
            { pubDate: () => new Date(post.date).toUTCString() },
            { description: () => makePostDescription(post, options) },
            { category: post.category ?? "uncategorized" },
          ],
        })),
      ],
    },
  };

  const xml = xmlFormat(toXML(rss));

  return xml;
}
