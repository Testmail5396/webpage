import React from "react";

/* ═══════════════════════════════════════════════════════════
   Brand detection + logo rendering for link thumbnails.
   Detects service from URL hostname and returns the matching
   brand logo as an inline SVG.
   ═══════════════════════════════════════════════════════════ */

/* ── Detection rules (specific before generic) ──────────── */

const BRAND_RULES = [
  { brand: "figma",          test: (h) => h.includes("figma.com") },
  { brand: "youtube",        test: (h) => h.includes("youtube.com") || h.includes("youtu.be") },
  { brand: "medium",         test: (h) => h.includes("medium.com") },
  { brand: "instagram",      test: (h) => h.includes("instagram.com") },
  { brand: "facebook",       test: (h) => h.includes("facebook.com") || h.includes("fb.com") || h.includes("fb.me") },
  { brand: "x",              test: (h) => h === "x.com" || h === "www.x.com" || h.includes("twitter.com") },
  { brand: "linkedin",       test: (h) => h.includes("linkedin.com") },
  { brand: "dribbble",       test: (h) => h.includes("dribbble.com") },
  { brand: "behance",        test: (h) => h.includes("behance.net") },
  { brand: "notion",         test: (h) => h.includes("notion.so") || h.includes("notion.site") },
  { brand: "github",         test: (h) => h.includes("github.com") },
  // Zoho products — specific subdomains first
  { brand: "zoho-desk",      test: (h) => h.includes("desk.zoho.com") },
  { brand: "zoho-connect",   test: (h) => h.includes("connect.zoho.com") },
  { brand: "zoho-cliq",      test: (h) => h.includes("cliq.zoho.com") },
  { brand: "zoho-crm",       test: (h) => h.includes("crm.zoho.com") },
  { brand: "zoho-mail",      test: (h) => h.includes("mail.zoho.com") },
  { brand: "zoho-projects",  test: (h) => h.includes("projects.zoho.com") },
  { brand: "zoho-people",    test: (h) => h.includes("people.zoho.com") },
  { brand: "zoho-creator",   test: (h) => h.includes("creator.zoho.com") },
  { brand: "zoho-analytics", test: (h) => h.includes("analytics.zoho.com") },
  { brand: "zoho-books",     test: (h) => h.includes("books.zoho.com") },
  { brand: "zoho-one",       test: (h) => h.includes("one.zoho.com") },
  { brand: "zoho-survey",    test: (h) => h.includes("survey.zoho.com") },
  { brand: "zoho-forms",     test: (h) => h.includes("forms.zoho.com") },
  { brand: "zoho-sign",      test: (h) => h.includes("sign.zoho.com") },
  { brand: "zoho-sheet",     test: (h) => h.includes("sheet.zoho.com") },
  { brand: "zoho-show",      test: (h) => h.includes("show.zoho.com") },
  { brand: "zoho-writer",    test: (h) => h.includes("writer.zoho.com") },
  { brand: "zoho",           test: (h) => h.includes("zoho.com") || h.includes("zoho.in") || h.includes("zoho.eu") },
];

export function detectBrand(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BRAND_RULES.find((r) => r.test(hostname))?.brand || null;
  } catch {
    return null;
  }
}

/* ── Zoho product metadata ──────────────────────────────── */

const ZOHO_PRODUCTS = {
  "zoho":           { color: "#E42527", label: "Z",  name: "Zoho" },
  "zoho-desk":      { color: "#2B9E40", label: "D",  name: "Desk" },
  "zoho-connect":   { color: "#0D66D0", label: "C",  name: "Connect" },
  "zoho-cliq":      { color: "#F57D20", label: "Q",  name: "Cliq" },
  "zoho-crm":       { color: "#E42527", label: "C",  name: "CRM" },
  "zoho-mail":      { color: "#2B9E40", label: "M",  name: "Mail" },
  "zoho-projects":  { color: "#44883E", label: "P",  name: "Projects" },
  "zoho-people":    { color: "#F4A100", label: "P",  name: "People" },
  "zoho-creator":   { color: "#0088DA", label: "C",  name: "Creator" },
  "zoho-analytics": { color: "#1D6CB4", label: "A",  name: "Analytics" },
  "zoho-books":     { color: "#00A152", label: "B",  name: "Books" },
  "zoho-one":       { color: "#E42527", label: "1",  name: "One" },
  "zoho-survey":    { color: "#5B3B8C", label: "S",  name: "Survey" },
  "zoho-forms":     { color: "#F44336", label: "F",  name: "Forms" },
  "zoho-sign":      { color: "#0078D4", label: "S",  name: "Sign" },
  "zoho-sheet":     { color: "#0FA968", label: "S",  name: "Sheet" },
  "zoho-show":      { color: "#E65100", label: "S",  name: "Show" },
  "zoho-writer":    { color: "#2196F3", label: "W",  name: "Writer" },
};

/* ── Main BrandLogo component ───────────────────────────── */

export function BrandLogo({ url, className = "w-5 h-5", size = "sm" }) {
  const brand = detectBrand(url);
  if (!brand) return null;

  // Check for SVG-based logos first
  const SvgLogo = SVG_LOGOS[brand];
  if (SvgLogo) return <SvgLogo className={className} />;

  // Zoho products — colored rounded square with letter
  const zoho = ZOHO_PRODUCTS[brand];
  if (zoho) return <ZohoProductIcon info={zoho} className={className} />;

  return null;
}

/* ── Zoho product icon (colored square + letter) ────────── */

function ZohoProductIcon({ info, className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill={info.color} />
      <text
        x="24" y="24" dy=".35em"
        textAnchor="middle"
        fill="white"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fontWeight="700"
        fontSize="22"
      >
        {info.label}
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SVG Logo Components
   ═══════════════════════════════════════════════════════════ */

const SVG_LOGOS = {
  /* ── Figma ──────────────────────────────────────────────── */
  figma: ({ className }) => (
    <svg className={className} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
    </svg>
  ),

  /* ── YouTube ────────────────────────────────────────────── */
  youtube: ({ className }) => (
    <svg className={className} viewBox="0 0 48 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47 9.5a5.95 5.95 0 0 0-4.2-4.2C39.2 4 24 4 24 4S8.8 4 5.2 5.3A5.95 5.95 0 0 0 1 9.5C0 13.1 0 17 0 17s0 3.9 1 7.5a5.95 5.95 0 0 0 4.2 4.2C8.8 30 24 30 24 30s15.2 0 18.8-1.3A5.95 5.95 0 0 0 47 24.5C48 20.9 48 17 48 17s0-3.9-1-7.5z" fill="#FF0000" />
      <path d="M19 23V11l10.5 6L19 23z" fill="white" />
    </svg>
  ),

  /* ── Medium ─────────────────────────────────────────────── */
  medium: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#000" />
      <ellipse cx="16" cy="24" rx="8" ry="8" fill="white" />
      <ellipse cx="32" cy="24" rx="4.5" ry="7.5" fill="white" />
      <ellipse cx="42" cy="24" rx="2" ry="6.5" fill="white" />
    </svg>
  ),

  /* ── Instagram ──────────────────────────────────────────── */
  instagram: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-bg" x1="7" y1="41" x2="41" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFC107" />
          <stop offset="30%" stopColor="#F44336" />
          <stop offset="60%" stopColor="#E040FB" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-bg)" />
      <rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="3" fill="none" />
      <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3" fill="none" />
      <circle cx="35" cy="13" r="2" fill="white" />
    </svg>
  ),

  /* ── Facebook ───────────────────────────────────────────── */
  facebook: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#1877F2" />
      <path d="M33 24.5h-5.5V42h-7V24.5H17V18h3.5v-3.5C20.5 10 23 7 27.5 7H33v6h-3.5c-1.5 0-2.5.8-2.5 2.5V18H33l-1 6.5z" fill="white" />
    </svg>
  ),

  /* ── X (Twitter) ────────────────────────────────────────── */
  x: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#000" />
      <path d="M27.3 21.7L37.5 10h-2.4l-8.9 10.2L19 10H10l10.7 15.4L10 38h2.4l9.4-10.8L29.3 38H38.3L27.3 21.7zm-3.3 3.8l-1.1-1.5L13.4 12h3.7l7 9.9 1.1 1.5 9 12.8h-3.7l-7.4-10.5z" fill="white" />
    </svg>
  ),

  /* ── LinkedIn ───────────────────────────────────────────── */
  linkedin: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0A66C2" />
      <path d="M15.5 20v14.5h-4V20h4zm-2-6.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM19.5 20h4v2c.8-1.3 2.5-2.5 5-2.5 5 0 6 3.2 6 7.5v7.5h-4V28c0-1.8-.4-3.5-2.5-3.5S25 26.2 25 28v6.5h-4V20z" fill="white" />
    </svg>
  ),

  /* ── Dribbble ───────────────────────────────────────────── */
  dribbble: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#EA4C89" />
      <path d="M40 20c-3.5.5-7.5.5-11-.5 1-3 2.5-6 4.5-8.5A20 20 0 0 1 40 20zM30 10c-2 2.5-3.5 5.5-4.5 8.5-4-1.5-7.5-3.5-10.5-6A19.8 19.8 0 0 1 30 10zm-18 5c3 2.5 6.5 4.5 10.5 6-1.5 4-2 8-2 12.5A19.8 19.8 0 0 1 4 24c0-3.5 1-6.5 2.5-9h5.5zm10 8.5c0.5 0 1 0 1.5-.1 3.5.5 7.5.5 11 .1.5 3-1 6-3 8.5-2-2-5-3.5-8.5-4-.3-1.5-.6-3-1-4.5z" fill="white" opacity=".4" />
    </svg>
  ),

  /* ── Behance ────────────────────────────────────────────── */
  behance: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#1769FF" />
      <path d="M19.5 18c0-1.5-1.2-2.5-3-2.5H10v5H16.5c1.8 0 3-1 3-2.5zm.5 8.5c0-1.7-1.3-3-3.2-3H10v6h6.8c1.9 0 3.2-1.3 3.2-3zm-13-15h10c3.5 0 6 2 6 5.5 0 2-1 3.5-2.5 4.5 2 .8 3.5 2.8 3.5 5.2 0 3.8-3 6.3-7 6.3H7V11.5z" fill="white" />
      <path d="M29 28c.5 1.5 2 2.5 4 2.5 1.5 0 2.8-.7 3.3-1.8h3.7c-1 3.2-3.8 5.3-7 5.3-4.5 0-7.5-3.2-7.5-7.5S28.5 19 33 19c4.8 0 7.3 3.8 7 9H29zm7.5-3c-.3-1.5-1.7-2.5-3.5-2.5s-3.2 1-3.5 2.5h7zM29 15h8v2h-8v-2z" fill="white" />
    </svg>
  ),

  /* ── Notion ─────────────────────────────────────────────── */
  notion: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#000" />
      <path d="M14 10h13l7 9v19H14V10z" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M19 19h10M19 25h10M19 31h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  /* ── GitHub ─────────────────────────────────────────────── */
  github: ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#181717" />
      <path d="M24 8C15.2 8 8 15.2 8 24c0 7.1 4.6 13 10.9 15.1.8.2 1.1-.3 1.1-.8v-2.7c-4.5 1-5.4-2.2-5.4-2.2-.7-1.9-1.8-2.4-1.8-2.4-1.5-1 .1-1 .1-1 1.6.1 2.5 1.7 2.5 1.7 1.4 2.5 3.7 1.8 4.7 1.3.1-1.1.6-1.8 1-2.2-3.6-.4-7.3-1.8-7.3-8 0-1.8.6-3.2 1.7-4.4-.2-.4-.7-2.1.1-4.3 0 0 1.4-.4 4.5 1.7 1.3-.4 2.7-.5 4.1-.5 1.4 0 2.8.2 4.1.5 3.1-2.1 4.5-1.7 4.5-1.7.9 2.2.3 3.9.2 4.3 1 1.2 1.7 2.6 1.7 4.4 0 6.3-3.8 7.6-7.4 8 .6.5 1.1 1.5 1.1 3v4.5c0 .4.3.9 1.1.8C35.4 37 40 31.1 40 24c0-8.8-7.2-16-16-16z" fill="white" />
    </svg>
  ),
};
