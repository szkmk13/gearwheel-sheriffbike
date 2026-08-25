import React from 'react';
import { Star, Icon } from './Icons.jsx';

function Stars({ n = 5, size = 14 }) {
  return (
    <span className="inline-flex gap-0.5 text-gold">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} style={{ opacity: i < Math.round(n) ? 1 : 0.22 }} />
      ))}
    </span>
  );
}

function Avatar({ review }) {
  const [broken, setBroken] = React.useState(false);
  const initial = (review.author || '?').trim().charAt(0).toUpperCase();

  if (review.author_photo && !broken) {
    return (
      <img
        src={review.author_photo}
        alt=""
        width="40"
        height="40"
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-10 w-10 flex-none rounded-full bg-paper-3 object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent-soft font-brand text-[17px] font-black text-accent-deep">
      {initial}
    </span>
  );
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = React.useState(false);
  const text = review.text || '';
  // Google returns full review bodies, some of them very long. Clamp anything
  // past a paragraph so the modal stays scannable, with an inline opt-in.
  const isLong = text.length > 280;
  const shown = expanded || !isLong ? text : text.slice(0, 280).trimEnd() + '…';

  return (
    <li className="rounded-2xl border border-line bg-paper-2 p-5">
      <div className="flex items-center gap-3">
        <Avatar review={review} />
        <div className="min-w-0">
          {/* Attribution back to the author's Google profile is required by
              the Places API terms - never strip this link. */}
          <a
            href={review.author_url || undefined}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="block truncate font-bold text-[15px] text-ink hover:text-accent-deep"
          >
            {review.author || 'Użytkownik Google'}
          </a>
          <div className="mt-1 flex items-center gap-2">
            <Stars n={review.rating} />
            <span className="text-[12.5px] text-ink-3">{review.relative_time}</span>
          </div>
        </div>
      </div>
      {shown && (
        <p className="mt-3.5 whitespace-pre-line text-[15px] leading-[1.6] text-ink-2">
          {shown}{' '}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="cursor-pointer font-semibold text-accent-deep hover:underline"
            >
              {expanded ? 'Zwiń' : 'Czytaj dalej'}
            </button>
          )}
        </p>
      )}
    </li>
  );
}

export function ReviewsModal({ open, onClose, rating, total, reviews, mapsUrl }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // The vertical padding is what keeps the panel clear of the sticky navbar -
    // it used to be p-4 with a max-h of 86vh, so a full list ran right up under
    // the nav. Sized in vh so short viewports still get a usable panel.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-[clamp(40px,14vh,140px)]"
      role="dialog"
      aria-modal="true"
      aria-label="Opinie w Google"
    >
      <div
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_52%,transparent)] backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-full w-full max-w-[680px] flex-col overflow-hidden rounded-[22px] border border-line bg-paper shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="flex items-center gap-3.5">
            <Icon.google width={30} height={30} className="flex-none" />
            <div>
              <div className="flex items-baseline gap-2">
                <strong className="font-brand text-[30px] font-black leading-none">
                  {rating != null ? String(rating).replace('.', ',') : '-'}
                </strong>
                <Stars n={rating || 5} size={16} />
              </div>
              <div className="mt-1.5 text-[13.5px] text-ink-3">
                {total != null ? `${total} opinii w Google` : 'Opinie w Google'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="-mr-1 flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {reviews.length ? (
            <ul className="flex flex-col gap-3.5">
              {reviews.map((r, i) => <ReviewCard key={i} review={r} />)}
            </ul>
          ) : (
            <p className="py-8 text-center text-[15px] text-ink-3">
              Nie udało się teraz wczytać opinii. Zajrzyj do nas w Google.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          {/* Places API returns at most 5 reviews, so the link out is the only
              way to see the rest - not decoration. */}
          <span className="text-[12.5px] text-ink-3">Opinie pochodzą z Google</span>
          <a
            href={mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Sheriff+Bike+Gda%C5%84sk'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[14.5px] font-bold text-accent-deep hover:underline"
          >
            Zobacz wszystkie w Google <Icon.arrow width={16} height={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
