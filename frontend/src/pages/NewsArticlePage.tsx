import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { getAllPosts, getPostBySlug } from "../content/posts";
import { useElectionStore } from "../store/electionStore";

function formatDate(date: string, lang: "en" | "np") {
  return new Date(date).toLocaleDateString(lang === "np" ? "ne-NP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderSimpleMarkdown(body: string) {
  const lines = body.trim().split(/\r?\n/);
  const blocks: Array<{ type: "h2" | "p" | "ul"; content: string | string[] }> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", content: line.slice(3).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", content: items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || next.startsWith("## ") || next.startsWith("- ")) break;
      paragraph.push(next);
      i += 1;
    }
    blocks.push({ type: "p", content: paragraph.join(" ") });
  }

  return blocks.map((block, index) => {
    if (block.type === "h2") {
      return (
        <h2 key={`h2-${index}`} className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {block.content as string}
        </h2>
      );
    }

    if (block.type === "ul") {
      return (
        <ul key={`ul-${index}`} className="list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-400">
          {(block.content as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={`p-${index}`} className="leading-7 text-slate-600 dark:text-slate-400">
        {block.content as string}
      </p>
    );
  });
}

export default function NewsArticlePage() {
  const { slug = "" } = useParams();
  const lang = useElectionStore((state) => state.lang);
  const post = getPostBySlug(slug);

  const relatedPosts = useMemo(
    () => getAllPosts().filter((entry) => entry.slug !== slug).slice(0, 2),
    [slug],
  );

  useEffect(() => {
    if (!post) {
      document.title = "Story Not Found – NepalVotes";
      return;
    }

    document.title = `${post.title} – NepalVotes`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", post.excerpt);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/news/${post.slug}`);
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, [post]);

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-rose-300">
      {post?.category ?? "Story"}
    </span>
  );

  if (!post) {
    return (
      <Layout
        title="Story Not Found"
        titleNp="लेख भेटिएन"
        subtitle="The requested article is not available in the local archive."
        subtitleNp="मागिएको लेख स्थानीय अभिलेखमा भेटिएन।"
        badge={heroBadge}
      >
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <p className="text-slate-600 dark:text-slate-400">
              {lang === "np" ? "यो लेख उपलब्ध छैन।" : "This article is not available."}
            </p>
            <Link to="/news" className="mt-4 inline-flex text-sm font-semibold text-[#2563eb] hover:underline">
              {lang === "np" ? "समाचारमा फर्कनुहोस्" : "Back to news"}
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout
      title={post.title}
      titleNp={post.titleNp}
      subtitle={post.excerpt}
      subtitleNp={post.excerptNp}
      badge={heroBadge}
    >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <span>{formatDate(post.publishedAt, lang)}</span>
            <span>{post.readTime}</span>
            <span>{post.category}</span>
          </div>
          <div className="mt-6 space-y-5">
            {renderSimpleMarkdown(post.body)}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {lang === "np" ? "सम्बन्धित" : "Related"}
            </h2>
            <div className="mt-4 space-y-3">
              {relatedPosts.map((entry) => (
                <Link
                  key={entry.slug}
                  to={`/news/${entry.slug}`}
                  className="block rounded-xl border border-slate-200 p-3 transition hover:border-[#2563eb]/40 hover:bg-blue-50/50 dark:border-slate-800 dark:hover:border-[#3b82f6]/40 dark:hover:bg-slate-900/60"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    {entry.category}
                  </div>
                  <div className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                    {lang === "np" ? entry.titleNp : entry.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-[#0c1525]">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {lang === "np" ? "डेटा पृष्ठहरू" : "Data Pages"}
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/analysis" className="block font-semibold text-[#2563eb] hover:underline">
                {lang === "np" ? "विश्लेषण" : "Analysis"}
              </Link>
              <Link to="/parties" className="block font-semibold text-[#2563eb] hover:underline">
                {lang === "np" ? "दलहरू" : "Parties"}
              </Link>
              <Link to="/explore" className="block font-semibold text-[#2563eb] hover:underline">
                {lang === "np" ? "क्षेत्रहरू" : "Constituencies"}
              </Link>
            </div>
          </div>
        </aside>
      </main>
    </Layout>
  );
}
