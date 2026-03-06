import { useElectionStore } from "../store/electionStore";
import { t } from "../i18n";
import type { Lang } from "../i18n";

interface Props {
  code: string;
  lang: Lang;
  className?: string;
}

export default function FeaturedToggleButton({ code, lang, className = "" }: Props) {
  const isFeatured = useElectionStore((s) => s.featuredFavorites.has(code));
  const toggleFeaturedFavorite = useElectionStore((s) => s.toggleFeaturedFavorite);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFeaturedFavorite(code);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isFeatured ? t("removeFromFeatured", lang) : t("addToFeatured", lang)}
      title={isFeatured ? t("removeFromFeatured", lang) : t("addToFeatured", lang)}
      className={`shrink-0 rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        isFeatured
          ? "text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
          : "text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill={isFeatured ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 17.3 6 20.5l1.2-6.8L2 8.9l6.9-1L12 1.8l3.1 6.1 6.9 1-5.2 4.8 1.2 6.8z" />
      </svg>
    </button>
  );
}
