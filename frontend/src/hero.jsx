import React from 'react';
import { SheriffStar, Star, Icon } from './icons.jsx';
import { CustomSelect } from './custom-select.jsx';

const ASSET_BASE = import.meta.env.BASE_URL;

const NAV_ITEMS = [
  { href: "#uslugi", label: "Usługi" },
  { href: "#zima", label: "Serwis zimowy" },
  { href: "#galeria", label: "Galeria" },
  { href: "#rezerwacja", label: "Rezerwacja" },
  { href: "#kontakt", label: "Kontakt" },
];

function AccentTitle({ text, className }) {
  const lines = (text || "").split("\n");
  return (
    <React.Fragment>
      {lines.map((ln, i) => (
        <React.Fragment key={i}>
          {i === lines.length - 1 && lines.length > 1
            ? <span className="accent-word">{ln}</span>
            : ln}
          {i < lines.length - 1 && <br/>}
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
    <nav className={"nav" + (scrolled ? " scrolled" : "") + (open ? " menu-open" : "")}>
      <div className="wrap nav-inner">
        <a className="brand" href="#top" onClick={() => setOpen(false)}>
          <img className="brand-logo" src={ASSET_BASE + "assets/favicon.png"} alt={c.brand.name} width="38" height="38" />
          <span className="name">{c.brand.name}<small>{c.brand.tagline}</small></span>
        </a>
        <div className="nav-links">
          {NAV_ITEMS.map((it) => <a key={it.href} href={it.href}>{it.label}</a>)}
        </div>
        <div className="nav-cta">
          <a className="nav-phone" href={"tel:" + c.brand.phoneHref}>{Icon.phone()}{c.brand.phone}</a>
          <a className="btn btn-primary nav-book" href="#rezerwacja" style={{ height: 44, padding: "0 20px", fontSize: 14.5 }}>{c.hero.ctaPrimary}</a>
          <button className="nav-burger" aria-label={open ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={"nav-mobile" + (open ? " on" : "")} onClick={() => setOpen(false)}>
        <div className="nav-mobile-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="nav-mobile-links">
            {NAV_ITEMS.map((it) => (
              <a key={it.href} href={it.href} onClick={() => setOpen(false)}>
                {it.label} {Icon.arrow({ width: 18, height: 18 })}
              </a>
            ))}
          </div>
          <a className="btn btn-primary btn-lg" href="#rezerwacja" onClick={() => setOpen(false)} style={{ width: "100%" }}>
            {c.hero.ctaPrimary} {Icon.arrow()}
          </a>
          <a className="nav-mobile-phone" href={"tel:" + c.brand.phoneHref} onClick={() => setOpen(false)}>
            {Icon.phone({ width: 18, height: 18 })} {c.brand.phone}
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroActions({ c }) {
  return (
    <div className="hero-actions">
      <a className="btn btn-primary btn-lg" href="#rezerwacja">{c.hero.ctaPrimary} {Icon.arrow()}</a>
      <a className="btn btn-ghost btn-lg" href="#uslugi">{c.hero.ctaSecondary}</a>
    </div>
  );
}

function RatingChip({ dark, c }) {
  const rating = (c && c.trust && c.trust[0]) || { k: "5,0", v: "" };
  return (
    <div className={"rating-chip" + (dark ? " on-dark" : "")}>
      <span className="stars">{[0,1,2,3,4].map(i => <Star key={i} size={15} />)}</span>
      <strong>{(rating.k || "5,0").split("/")[0].trim()}</strong>
      <span className="rc-sep" />
      <span className="rc-meta">81 opinii w Google</span>
    </div>
  );
}

function HeroSplit({ c }) {
  return (
    <header className="hero hero-split" id="top">
      <div className="wrap hero-split-grid">
        <div className="hero-copy">
          <div className="eyebrow"><SheriffStar size={15} /> {c.hero.eyebrow}</div>
          <h1 className="display hero-title"><AccentTitle text={c.hero.title} /></h1>
          <p className="hero-sub">{c.hero.sub}</p>
          <HeroActions c={c} />
          <div className="hero-meta">
            <RatingChip c={c} />
            <span className="hero-meta-pin">{Icon.pin({ width: 15, height: 15 })} {c.contact.address}</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-star-watermark"><SheriffStar size={420} /></div>
          <img className="hero-slot" style={{ borderRadius: 20 }} src={ASSET_BASE + "assets/trek.jpg"} alt="Rower szosowy" />
          <div className="hero-float-card">
            <span className="hfc-num">12+</span>
            <span className="hfc-label">lat na warsztacie</span>
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

  const goBook = () => {
    try {
      sessionStorage.setItem("sheriff:prefill", JSON.stringify({ equip, service }));
      window.dispatchEvent(new CustomEvent("sheriff:prefill", { detail: { equip, service } }));
    } catch (e) {}
    document.getElementById("rezerwacja").scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="hero hero-centered" id="top">
      <img className="hero-cb-slot" src={ASSET_BASE + "assets/trek.jpg"} alt="Warsztat rowerowy" />
      <div className="hero-cb-scrim" />
      <div className="wrap hero-cb-inner">
        <div className="eyebrow on-dark" style={{ justifyContent: "center" }}><SheriffStar size={15} /> {c.hero.eyebrow}</div>
        <h1 className="display hero-cb-title"><AccentTitle text={c.hero.title} /></h1>
        <p className="hero-cb-sub">{c.hero.sub}</p>

        <div className="hero-bookbar" role="group" aria-label="Szybka rezerwacja">
          <div className="hbb-field">
            <label>Sprzęt</label>
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
          <div className="hbb-field">
            <label>Usługa</label>
            <CustomSelect
              value={service}
              onChange={setService}
              options={[{ value: "", label: "Wybierz usługę…" }, ...opts.map((o) => ({ value: o, label: o }))]}
            />
          </div>
          <button type="button" className="btn btn-primary hbb-btn" onClick={goBook}>
            Sprawdź termin {Icon.arrow()}
          </button>
        </div>

        <div className="hero-cb-meta"><RatingChip dark c={c} /></div>
      </div>
    </header>
  );
}

function HeroOverlay({ c }) {
  return (
    <header className="hero hero-overlay" id="top">
      <img className="hero-o-slot" src={ASSET_BASE + "assets/trek.jpg"} alt="Rower w warsztacie" />
      <div className="hero-o-scrim" />
      <div className="wrap hero-o-inner">
        <div className="eyebrow on-dark"><SheriffStar size={15} /> {c.hero.eyebrow}</div>
        <h1 className="display hero-o-title"><AccentTitle text={c.hero.title} /></h1>
        <p className="hero-o-sub">{c.hero.sub}</p>
        <div className="hero-o-actions">
          <a className="btn btn-primary btn-lg" href="#rezerwacja">{c.hero.ctaPrimary} {Icon.arrow()}</a>
          <a className="btn btn-lg hero-o-ghost" href="#uslugi">{c.hero.ctaSecondary}</a>
        </div>
        <div className="hero-o-meta"><RatingChip dark c={c} /></div>
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
  return (
    <section className="trust">
      <div className="wrap trust-inner">
        {c.trust.map((it, i) => (
          <div className="trust-item" key={i}>
            <div className="trust-k display">{it.k}</div>
            <div className="trust-v">{it.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export { Nav, Hero, TrustStrip, AccentTitle };
