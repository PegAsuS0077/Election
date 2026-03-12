export type NewsPost = {
  slug: string;
  title: string;
  titleNp: string;
  excerpt: string;
  excerptNp: string;
  category: string;
  publishedAt: string;
  readTime: string;
  coverLabel: string;
  body: string;
};

type Frontmatter = Omit<NewsPost, "body">;

const markdownModules = import.meta.glob("./posts/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "").trim();
}

function parseMarkdownFile(path: string, raw: string): NewsPost {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const sourceSlug = path.split("/").pop()?.replace(/\.md$/, "") ?? "post";

  if (!match) {
    return {
      slug: sourceSlug,
      title: sourceSlug,
      titleNp: sourceSlug,
      excerpt: "",
      excerptNp: "",
      category: "Story",
      publishedAt: "2026-03-01",
      readTime: "4 min read",
      coverLabel: "Story",
      body: raw.trim(),
    };
  }

  const [, frontmatterRaw, body] = match;
  const frontmatter = frontmatterRaw.split(/\r?\n/).reduce<Partial<Frontmatter>>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) return acc;

    const key = trimmed.slice(0, separatorIndex).trim() as keyof Frontmatter;
    const value = stripQuotes(trimmed.slice(separatorIndex + 1));
    acc[key] = value as never;
    return acc;
  }, {});

  return {
    slug: frontmatter.slug ?? sourceSlug,
    title: frontmatter.title ?? sourceSlug,
    titleNp: frontmatter.titleNp ?? frontmatter.title ?? sourceSlug,
    excerpt: frontmatter.excerpt ?? "",
    excerptNp: frontmatter.excerptNp ?? frontmatter.excerpt ?? "",
    category: frontmatter.category ?? "Story",
    publishedAt: frontmatter.publishedAt ?? "2026-03-01",
    readTime: frontmatter.readTime ?? "4 min read",
    coverLabel: frontmatter.coverLabel ?? "Story",
    body: body.trim(),
  };
}

const POSTS = Object.entries(markdownModules)
  .map(([path, raw]) => parseMarkdownFile(path, raw))
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

export function getAllPosts(): NewsPost[] {
  return POSTS;
}

export function getPostBySlug(slug: string): NewsPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}
