const rawReviewMode = String(import.meta.env.VITE_ADSENSE_REVIEW_MODE ?? "").toLowerCase().trim();

/**
 * When true, disable non-Google monetization behavior for safer AdSense review.
 * Enable with: VITE_ADSENSE_REVIEW_MODE=true
 */
export const ADSENSE_REVIEW_MODE = rawReviewMode === "true";
