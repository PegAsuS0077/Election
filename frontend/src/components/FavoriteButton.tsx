import { useElectionStore } from "../store/electionStore";
import { requestNotificationPermission } from "../hooks/useConstituencyNotifications";
import { t } from "../i18n";
import type { Lang } from "../i18n";

interface Props {
  code: string;
  name: string;
  lang: Lang;
  className?: string;
}

export default function FavoriteButton({ code, name, lang, className = "" }: Props) {
  const isFav = useElectionStore((s) => s.favorites.has(code));
  const toggleFavorite = useElectionStore((s) => s.toggleFavorite);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger parent card click
    e.preventDefault();

    if (!isFav) {
      // Ask for notification permission the first time a user watches a constituency
      await requestNotificationPermission();
    }
    toggleFavorite(code);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`${isFav ? t("removeFavorite", lang) : t("addFavorite", lang)}: ${name}`}
      title={isFav ? t("removeFavorite", lang) : t("addFavorite", lang)}
      className={`shrink-0 rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        isFav
          ? "text-amber-400 hover:text-amber-300"
          : "text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
