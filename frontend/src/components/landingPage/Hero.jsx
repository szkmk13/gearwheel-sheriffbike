import React from 'react';
import { SheriffStar, Star, Icon } from './Icons.jsx';
import { CustomSelect } from './CustomSelect.jsx';
import { BTN, BTN_PRIMARY, BTN_GHOST } from './buttonStyles.js';
import { ReviewsModal } from './ReviewsModal.jsx';
import { useGoogleReviews } from './useGoogleReviews.js';
import { prefillBooking } from './bookingPrefill.js';

const ASSET_BASE = import.meta.env.BASE_URL;

const NAV_ITEMS = [
  { href: "#uslugi", label: "Usługi" },
  { href: "#zima", label: "Serwis zimowy" },
  { href: "#rezerwacja", label: "Rezerwacja" },
  { href: "#kontakt", label: "Kontakt" },
];

function AccentTitle({ text }) {
  const lines = (text || "").split("\n");
  return (
    <React.Fragment>
      {lines.map((ln, i) => (
        <React.Fragment key={i}>
          {i === lines.length - 1 && lines.length > 1
            ? <span className="text-accent">{ln}</span>
            : ln}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
}

function Nav({ c }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <nav
      className={
        "sticky top-0 z-[60] border-b border-transparent bg-[color-mix(in_oklab,var(--color-paper)_82%,transparent)] backdrop-blur-[12px] backdrop-saturate-[1.4] transition-colors duration-300 " +
        (scrolled ? "border-line bg-[color-mix(in_oklab,var(--color-paper)_92%,transparent)]" : "")
      }
    >
      <div className="mx-auto flex h-[74px] max-w-[1240px] items-center justify-between px-[clamp(20px,5vw,64px)]">
        <a className="flex items-center gap-[11px]" href="#top" onClick={() => setOpen(false)}>
          <img className="h-[38px] w-[38px] flex-none rounded-[9px] object-cover" src={ASSET_BASE + "assets/favicon.png"} alt={c.brand.name} width="38" height="38" />
          <span className="font-brand text-[21px] font-black uppercase leading-none">
            {c.brand.name}
            <small className="mt-[3px] block text-[9.5px] font-semibold tracking-[0.42em] text-ink-3">{c.brand.tagline}</small>
          </span>
        </a>
        <div className="flex items-center gap-[30px] max-[900px]:hidden">
          {NAV_ITEMS.map((it) => (
            <a key={it.href} href={it.href} className="text-[14.5px] font-semibold text-ink-2 transition-colors hover:text-ink">{it.label}</a>
          ))}
        </div>
        <div className="flex items-center gap-[14px]">
          <a className="flex items-center gap-[7px] text-[14.5px] font-bold max-[900px]:hidden" href={"tel:" + c.brand.phoneHref}>
            <Icon.phone width={15} height={15} className="text-accent" />{c.brand.phone}
          </a>
          <a
            className={BTN_PRIMARY + " max-[900px]:hidden"}
            href="#rezerwacja"
            style={{ height: 44, padding: "0 20px", fontSize: 14.5 }}
          >
            {c.hero.ctaPrimary}
          </a>
          <button
            className="hidden h-11 w-11 flex-col justify-center gap-[5px] border-0 bg-transparent p-[11px] max-[900px]:flex"
            aria-label={open ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={"block h-[2.2px] w-full rounded bg-ink transition-transform duration-[260ms] " + (open ? "translate-y-[7.2px] rotate-45" : "")} />
            <span className={"block h-[2.2px] w-full rounded bg-ink transition-opacity duration-200 " + (open ? "opacity-0" : "")} />
            <span className={"block h-[2.2px] w-full rounded bg-ink transition-transform duration-[260ms] " + (open ? "-translate-y-[7.2px] -rotate-45" : "")} />
          </button>
        </div>
      </div>

      <div
        className={
          "fixed inset-x-0 top-[74px] bottom-0 z-[55] bg-[color-mix(in_oklab,var(--color-ink)_38%,transparent)] backdrop-blur-[4px] transition-opacity duration-[280ms] min-[901px]:hidden " +
          (open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={() => setOpen(false)}
      >
        <div
          className={
            "flex flex-col gap-[14px] border-b border-line bg-paper px-[clamp(20px,5vw,64px)] pb-7 pt-[22px] shadow-lg transition-transform duration-[280ms] " +
            (open ? "translate-y-0" : "-translate-y-3")
          }
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line px-1 py-4 text-[19px] font-semibold"
              >
                {it.label} <Icon.arrow width={18} height={18} className="text-accent" />
              </a>
            ))}
          </div>
          <a className={BTN_PRIMARY + " h-[58px] px-8 text-[16.5px] w-full"} href="#rezerwacja" onClick={() => setOpen(false)}>
            {c.hero.ctaPrimary} <Icon.arrow className="text-white" />
          </a>
          <a className="inline-flex items-center justify-center gap-[9px] pt-1 font-brand text-[19px] font-bold" href={"tel:" + c.brand.phoneHref} onClick={() => setOpen(false)}>
            <Icon.phone width={18} height={18} className="text-accent" /> {c.brand.phone}
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroActions({ c }) {
  return (
    <div className="mt-[34px] flex flex-wrap gap-[14px]">
      <a className={BTN_PRIMARY + " h-[58px] px-8 text-[16.5px]"} href="#rezerwacja">{c.hero.ctaPrimary} <Icon.arrow /></a>
      <a className={BTN_GHOST + " h-[58px] px-8 text-[16.5px]"} href="#uslugi">{c.hero.ctaSecondary}</a>
    </div>
  );
}

function RatingChip({ dark, c }) {
  const [open, setOpen] = React.useState(false);
  const { rating, total, reviews, mapsUrl } = useGoogleReviews();

  // Live Google numbers when they arrive, otherwise the copy in content-data.js
  // so the chip never flashes empty or blocks the hero on a network call.
  const fallback = (c && c.trust && c.trust[0]) || { k: "5,0" };
  const score = rating != null
    ? String(rating).replace(".", ",")
    : (fallback.k || "5,0").split("/")[0].trim();
  // Same fallback as the "zadowolonych klientów" cell in TrustStrip - the two
  // sit on the same screen, so they must not disagree.
  const count = total != null ? total : 87;

  // Only offer the modal once there is something to put in it.
  const clickable = reviews.length > 0;

  const inner = (
    <React.Fragment>
      <span className="inline-flex gap-0.5 text-gold [&_svg]:h-4 [&_svg]:w-4">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={15} />)}</span>
      <strong className="text-[15px] font-bold">{score}</strong>
      <span className={"h-4 w-px " + (dark ? "bg-white/25" : "bg-line-2")} />
      <span className={"font-medium " + (dark ? "text-white/85" : "text-ink-2")}>{count} opinii w Google</span>
      {clickable && (
        <span className={"ml-0.5 font-bold " + (dark ? "text-white" : "text-accent-deep")}>Pokaż</span>
      )}
    </React.Fragment>
  );

  const base =
    "inline-flex items-center gap-2.5 rounded-full py-[9px] pl-[14px] pr-4 text-sm " +
    (dark
      ? "border border-white/20 bg-white/10 text-white backdrop-blur-[8px]"
      : "border border-line bg-paper-2 shadow-sm");

  return (
    <React.Fragment>
      {clickable ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={base + " cursor-pointer transition-colors " + (dark ? "hover:bg-white/[.18]" : "hover:border-line-2 hover:bg-paper-3")}
        >
          {inner}
        </button>
      ) : (
        <div className={base}>{inner}</div>
      )}
      <ReviewsModal
        open={open}
        onClose={() => setOpen(false)}
        rating={rating}
        total={total}
        reviews={reviews}
        mapsUrl={mapsUrl}
      />
    </React.Fragment>
  );
}

function HeroSplit({ c }) {
  return (
    <header className="relative z-[1] overflow-clip py-[clamp(48px,7vw,96px)] pb-[clamp(64px,8vw,110px)]" id="top">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.04fr_0.96fr] items-center gap-[clamp(32px,5vw,72px)] px-[clamp(20px,5vw,64px)] max-[1000px]:grid-cols-1">
        <div>
          <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent-deep"><SheriffStar size={15} /> {c.hero.eyebrow}</div>
          <h1 className="mt-4 text-[clamp(48px,7.4vw,104px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em]"><AccentTitle text={c.hero.title} /></h1>
          <p className="mt-6 max-w-[30em] text-[clamp(17px,1.6vw,19.5px)] leading-[1.55] text-ink-2">{c.hero.sub}</p>
          <HeroActions c={c} />
          <div className="mt-[34px] flex flex-wrap items-center gap-x-[22px] gap-y-4">
            <RatingChip c={c} />
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-2"><Icon.pin width={15} height={15} className="text-accent" /> {c.contact.address}</span>
          </div>
        </div>
        <div className="relative max-[1000px]:max-w-[520px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[-1] -translate-x-[46%] -translate-y-[52%] text-[color-mix(in_oklab,var(--color-accent)_16%,transparent)]"><SheriffStar size={420} /></div>
          <picture>
            <source srcSet={ASSET_BASE + "assets/warsztat-narzedzia.webp"} type="image/webp" />
            <img
              className="aspect-[4/5] w-full rounded-[20px] bg-paper-3 object-cover shadow-lg max-[1000px]:aspect-[16/11]"
              src={ASSET_BASE + "assets/warsztat-narzedzia.jpg"}
              alt="Rower szosowy"
              width="1200"
              height="800"
              fetchPriority="high"
            />
          </picture>
          <div className="absolute -left-[26px] bottom-[34px] flex flex-col leading-none rounded-2xl bg-ink px-[22px] py-4 text-white shadow-lg max-[720px]:left-auto max-[720px]:right-3 max-[720px]:bottom-3 max-[720px]:px-[18px] max-[720px]:py-[13px]">
            <span className="font-brand text-[34px] font-black max-[720px]:text-[27px]">12+</span>
            <span className="mt-[7px] text-xs font-semibold text-[#C9BFB1]">lat na warsztacie</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroCentered({ c }) {
  const bikeOpts = c.services.bookingOptions || c.services.items.map((i) => i.title);
  const [equip, setEquip] = React.useState("rower");
  const [service, setService] = React.useState("");
  const opts = equip === "rower" ? bikeOpts : c.winter.items.map((i) => i.title);

  const goBook = () => prefillBooking({ equip, service });

  return (
    <header className="relative z-[1] flex min-h-[clamp(580px,88vh,840px)] items-center bg-ink" id="top">
      <picture>
        <source srcSet={ASSET_BASE + "assets/warsztat-narzedzia.webp"} type="image/webp" />
        <img
          className="absolute inset-0 h-full w-full bg-paper-3 object-cover"
          src={ASSET_BASE + "assets/warsztat-narzedzia.jpg"}
          alt="Warsztat rowerowy"
          width="1200"
          height="800"
          fetchPriority="high"
        />
      </picture>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,rgba(12,9,7,.35)_0%,rgba(12,9,7,.62)_70%,rgba(12,9,7,.8)_100%),linear-gradient(to_top,rgba(12,9,7,.55),rgba(12,9,7,.2))]" />
      <div className="relative z-[2] mx-auto w-full max-w-[900px] px-[clamp(20px,5vw,64px)] py-[clamp(56px,8vw,96px)] text-center">
        <div className="inline-flex items-center justify-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-white"><SheriffStar size={15} /> {c.hero.eyebrow}</div>
        <h1 className="mt-[18px] text-[clamp(44px,7vw,100px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em] text-white"><AccentTitle text={c.hero.title} /></h1>
        <p className="mx-auto mt-5 max-w-[32em] text-[clamp(16px,1.5vw,19px)] leading-[1.5] text-white/84">{c.hero.sub}</p>

        <div className="mx-auto mt-[34px] flex max-w-[680px] items-end gap-2.5 text-left max-[700px]:flex-col max-[700px]:items-stretch" role="group" aria-label="Szybka rezerwacja">
          <div className="min-w-0 flex-[0.7]">
            <label className="mb-[7px] block text-xs font-bold uppercase tracking-[.07em] text-white/65 max-[700px]:text-white/70">Sprzęt</label>
            <CustomSelect
              value={equip}
              onChange={(v) => { setEquip(v); setService(""); }}
              options={[
                { value: "rower", label: "Rower" },
                { value: "narty", label: "Narty" },
                { value: "snowboard", label: "Snowboard" },
              ]}
            />
          </div>
          <div className="min-w-0 flex-[1.5]">
            <label className="mb-[7px] block text-xs font-bold uppercase tracking-[.07em] text-white/65 max-[700px]:text-white/70">Usługa</label>
            <CustomSelect
              value={service}
              onChange={setService}
              options={[{ value: "", label: "Wybierz usługę…" }, ...opts.map((o) => ({ value: o, label: o }))]}
            />
          </div>
          <button type="button" className={BTN_PRIMARY + " flex-none max-[700px]:mt-1 max-[700px]:w-full"} onClick={goBook}>
            Sprawdź termin <Icon.arrow />
          </button>
        </div>

        <div className="mt-[26px] flex justify-center"><RatingChip dark c={c} /></div>
      </div>
    </header>
  );
}

function HeroOverlay({ c }) {
  return (
    <header className="relative z-[1] flex min-h-[clamp(560px,86vh,820px)] items-end bg-ink max-[720px]:min-h-[540px]" id="top">
      <picture>
        <source srcSet={ASSET_BASE + "assets/warsztat-narzedzia.webp"} type="image/webp" />
        <img
          className="absolute inset-0 h-full w-full bg-paper-3 object-cover"
          src={ASSET_BASE + "assets/warsztat-narzedzia.jpg"}
          alt="Rower w warsztacie"
          width="1200"
          height="800"
          fetchPriority="high"
        />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,9,7,.78)_0%,rgba(12,9,7,.34)_42%,rgba(12,9,7,.10)_72%,rgba(12,9,7,.22)_100%),linear-gradient(to_right,rgba(12,9,7,.42)_0%,rgba(12,9,7,0)_58%)]" />
      <div className="relative w-full px-[clamp(20px,5vw,64px)] py-[clamp(48px,7vw,88px)] text-white">
        <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-white"><SheriffStar size={15} /> {c.hero.eyebrow}</div>
        <h1 className="text-[clamp(46px,7.6vw,110px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em] text-white"><AccentTitle text={c.hero.title} /></h1>
        <p className="mt-[22px] max-w-[30em] text-[clamp(17px,1.6vw,20px)] text-white/82">{c.hero.sub}</p>
        <div className="mt-8 flex flex-wrap gap-[14px] max-[420px]:[&>a]:w-full">
          <a className={BTN_PRIMARY + " h-[58px] px-8 text-[16.5px]"} href="#rezerwacja">{c.hero.ctaPrimary} <Icon.arrow /></a>
          <a className={BTN + " h-[58px] px-8 text-[16.5px] border-white/28 bg-white/10 text-white backdrop-blur-[8px] hover:bg-white/[.18] hover:-translate-y-0.5"} href="#uslugi">{c.hero.ctaSecondary}</a>
        </div>
        <div className="mt-[30px]"><RatingChip dark c={c} /></div>
      </div>
    </header>
  );
}

function Hero({ c }) {
  const v = c.hero.variant;
  if (v === "centered") return <HeroCentered c={c} />;
  if (v === "split") return <HeroSplit c={c} />;
  return <HeroOverlay c={c} />;
}

function TrustStrip({ c }) {
  const { rating, total } = useGoogleReviews();

  // Cells tagged with `live` in content-data.js take the real Google numbers
  // when they arrive; everything else (and every cell before the request
  // lands, or if it fails) keeps the authored copy.
  const valueFor = (it) => {
    if (it.live === "rating" && rating != null) return `${rating.toFixed(1).replace(".", ",")} / 5`;
    if (it.live === "count" && total != null) return `${total}+`;
    return it.k;
  };

  return (
    <section className="border-y border-line bg-paper-2">
      <div className="mx-auto grid max-w-[1240px] grid-cols-4 px-[clamp(20px,5vw,64px)] max-[720px]:grid-cols-2">
        {c.trust.map((it, i) => (
          <div
            key={i}
            className={
              "border-l border-line px-6 py-[clamp(22px,3vw,34px)] text-center first:border-l-0 " +
              "max-[720px]:[&:nth-child(-n+2)]:border-b max-[720px]:[&:nth-child(-n+2)]:border-line max-[720px]:[&:nth-child(odd)]:border-l-0"
            }
          >
            <div className="text-[clamp(26px,3vw,38px)] font-black uppercase text-ink">{valueFor(it)}</div>
            <div className="mt-1.5 text-[13.5px] font-semibold tracking-[.01em] text-ink-3">{it.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { Nav, Hero, TrustStrip, AccentTitle };
