import React from 'react';
import {
  Phone, ArrowRight, ChevronDown, Check, MapPin, Clock, Wrench, SprayCan,
  Gauge, Settings2, Bike, Snowflake, Mountain, Scissors,
  Globe, Send, FileText, MoreHorizontal,
} from 'lucide-react';

/* ── SheriffStar - custom brand icon ─── */
/*
 * Proper 7-pointed star: outer_r=44, inner_r=19 (ratio 0.43).
 * Outer tips:  k * 51.43° starting at -90° (top).
 * Inner notches: offset by 25.71° between each pair of tips.
 * Bolts at all 7 tips; centre ring as a stroke-only circle.
 */
function SheriffStar({ size = 24, className = "", style = {} }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}
         style={style} fill="currentColor" aria-hidden="true">
      <path d="M50,6 L58.2,32.9 L84.4,22.6 L68.5,45.8 L92.9,59.8 L64.9,61.8 L69.1,89.6 L50,69 L30.9,89.6 L35.1,61.8 L7.1,59.8 L31.5,45.8 L15.6,22.6 L41.8,32.9 Z"/>
      <circle cx="50"   cy="6"    r="3.6" fill="#F6F2EB"/>
      <circle cx="84.4" cy="22.6" r="3.6" fill="#F6F2EB"/>
      <circle cx="92.9" cy="59.8" r="3.6" fill="#F6F2EB"/>
      <circle cx="69.1" cy="89.6" r="3.6" fill="#F6F2EB"/>
      <circle cx="30.9" cy="89.6" r="3.6" fill="#F6F2EB"/>
      <circle cx="7.1"  cy="59.8" r="3.6" fill="#F6F2EB"/>
      <circle cx="15.6" cy="22.6" r="3.6" fill="#F6F2EB"/>
      <circle cx="50"   cy="50"   r="13.5" fill="none" stroke="var(--paper, #f6f2eb)" strokeWidth="3"/>
    </svg>
  );
}

/* ── Star - filled rating star ─── */
function Star({ size = 16, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style} aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/>
    </svg>
  );
}

/* ── Social brand icons (not in lucide) ─── */
const FbSVG = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>
  </svg>
);
const IgSVG = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const GoogleSVG = (p) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z"/>
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z"/>
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3-3A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.4 6-4.4z"/>
  </svg>
);

/* ── mk: wrap lucide component to match old Icon.xxx({...}) call API ─── */
const mk = (C, sw = 2) => ({ width, height, size, className, style, ...rest } = {}) =>
  <C size={size || width || height || 24} className={className} style={style} strokeWidth={sw} {...rest} />;

const Icon = {
  phone:  mk(Phone),
  arrow:  mk(ArrowRight, 2.2),
  chevron: mk(ChevronDown, 2.2),
  check:  mk(Check, 2.6),
  pin:    mk(MapPin),
  clock:  mk(Clock),
  wrench: mk(Wrench),
  spray:  mk(SprayCan),
  gauge:  mk(Gauge),
  cog:    mk(Settings2),
  bike:   mk(Bike),
  snow:   mk(Snowflake),
  ski:    mk(Mountain),
  edge:   mk(Scissors),
  globe:  mk(Globe),
  send:   mk(Send),
  file:   mk(FileText),
  more:   mk(MoreHorizontal),
  fb:     (p) => <FbSVG {...p} />,
  ig:     (p) => <IgSVG {...p} />,
  google: (p) => <GoogleSVG {...p} />,
};

export { SheriffStar, Star, Icon };
