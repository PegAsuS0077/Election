import { useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getAllPosts } from "../content/posts";
import { useElectionStore } from "../store/electionStore";

function formatDate(date: string, lang: "en" | "np") {
  return new Date(date).toLocaleDateString(lang === "np" ? "ne-NP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NewsPage() {
  const lang = useElectionStore((state) => state.lang);
  const posts = getAllPosts();

  useEffect(() => {
    document.title = "News & Analysis – NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Election explainers, post-result analysis, and archive-based stories from NepalVotes.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/news");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, []);

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-rose-300">
      {lang === "np" ? "न्युज र ब्लग" : "News & Blog"}
    </span>
  );

  return (
    <Layout
      title="News & Analysis"
      titleNp="न्युज र विश्लेषण"
      subtitle="Archive-based explainers, post-election notes, and reporting built from the saved results"
      subtitleNp="सेभ गरिएको परिणामका आधारमा बनाइएका विश्लेषण, टिप्पणी र रिपोर्ट"
      badge={heroBadge}
    >
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="grid gap-5 lg:grid-cols-2">
          {posts.map((post, index) => (
            <article
              key={post.slug}
              className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-[#0c1525] ${
                index === 0 ? "lg:col-span-2 border-slate-200 dark:border-slate-800/80" : "border-slate-200 dark:border-slate-800/80"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{post.category}</span>
                <span>{formatDate(post.publishedAt, lang)}</span>
                <span>{post.readTime}</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px] sm:items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    <Link to={`/news/${post.slug}`} className="hover:text-[#2563eb] dark:hover:text-[#3b82f6]">
                      {lang === "np" ? post.titleNp : post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {lang === "np" ? post.excerptNp : post.excerpt}
                  </p>
                  <Link to={`/news/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-[#2563eb] hover:underline">
                    {lang === "np" ? "पूरा लेख पढ्नुहोस्" : "Read full story"}
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-5 text-center dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {post.coverLabel}
                  </div>
                  <div className="mt-4 text-4xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </Layout>
  );
}
