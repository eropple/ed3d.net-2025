export function blogPostUrl(slug: string): string {
  return `/blog/posts/${slug}`;
}

export function blogCategoryListUrl(slug: string): string {
  return `/blog/by-category/${slug}`;
}

export function blogTagListUrl(slug: string): string {
  return `/blog/by-tag/${slug}`;
}