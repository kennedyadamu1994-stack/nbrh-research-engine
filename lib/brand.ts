/**
 * The NBRH design tokens, mirrored from Kennedy's "Club House OS" system
 * so this tool's UI reads as part of the same family:
 *
 *   background   #1B1B1B   (dark)
 *   accent       #FF1B6E   (hot pink)
 *   headings     Young Serif
 *   body         DM Sans
 *   radius       4px
 *
 * The actual values live as CSS custom properties in app/globals.css —
 * this file is just the canonical reference and the logo URL, imported
 * wherever a component needs the brand mark rather than a colour.
 *
 * NOTE: the live Club House OS repo has since nudged its background to
 * #161616 and its radius to 3px. This repo follows the values written in
 * the kickoff brief (#1B1B1B / 4px). If Kennedy wants an exact match to
 * the newer Club House OS tokens, change them in one place: globals.css.
 */

export const NBRH_LOGO_URL =
  "https://images.squarespace-cdn.com/content/6718416feaa24175e29324d4/9d6e6464-e1e5-4dde-9ae0-03df420cbd77/NBRH+Logo.png?content-type=image%2Fpng";

export const BRAND = {
  bg: "#1B1B1B",
  pink: "#FF1B6E",
  fontHead: '"Young Serif", Georgia, serif',
  fontBody: '"DM Sans", -apple-system, sans-serif',
  radius: "4px",
} as const;
