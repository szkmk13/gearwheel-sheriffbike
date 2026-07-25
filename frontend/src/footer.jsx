import React from 'react';
import { SheriffStar, Icon } from './icons.jsx';
import { AccentTitle } from './hero.jsx';
import { CustomSelect } from './custom-select.jsx';
import { CustomDatePicker } from './custom-datepicker.jsx';

const ASSET_BASE = import.meta.env.BASE_URL;

function Gallery({ c }) {
  const g = c.gallery;
  const tiles = (g.tiles || []).filter((t) => t.url);
  if (tiles.length === 0) return null;
  return (
    <section className="section gallery" id="galeria">
      <div className="wrap">
        <div className="gallery-head">
          <div className="section-head">
            <div className="eyebrow"><SheriffStar size={14} /> {g.eyebrow}</div>
            <h2>{g.title}</h2>
          </div>
        </div>
        <div className="gallery-grid">
          {tiles.map((t) => (
            <div key={t.id} className={"gal-slot" + (t.span ? " gal-" + t.span : "")}>
              <img src={t.url} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const EQUIP = [
  { id: "rower", label: "Rower", icon: "bike" },
  { id: "zima", label: "Narty / Snowboard", icon: "ski" },
];

function BookingForm({ c }) {
  const bikeOpts = c.services.items.map((i) => i.title).concat(["Inne / nie wiem"]);
  const winterOpts = c.winter.items.map((i) => i.title).concat(["Pełny serwis", "Inne / nie wiem"]);
  const optsFor = (e) => (e === "rower" ? bikeOpts : winterOpts);

  const [equip, setEquip] = React.useState("rower");
  const [form, setForm] = React.useState({ name: "", phone: "", service: "", date: "", msg: "" });
  const [sent, setSent] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    const apply = (d) => {
      if (!d) return;
      if (d.equip) setEquip(d.equip === "rower" ? "rower" : "zima");
      if (d.service) setForm((f) => ({ ...f, service: d.service }));
    };
    try { apply(JSON.parse(sessionStorage.getItem("sheriff:prefill"))); } catch (e) {}
    const onPrefill = (e) => apply(e.detail);
    window.addEventListener("sheriff:prefill", onPrefill);
    return () => window.removeEventListener("sheriff:prefill", onPrefill);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const phoneOk = form.phone.replace(/\D/g, "").length >= 9;
  const valid = form.name.trim().length > 1 && phoneOk;

  const submit = (e) => { e.preventDefault(); setTouched(true); if (valid) setSent(true); };

  if (sent) {
    return (
      <div className="book-card book-success">
        <div className="bs-badge"><SheriffStar size={46} /></div>
        <h3 className="bs-title">Zgłoszenie przyjęte!</h3>
        <p className="bs-text">
          Dzięki, <strong>{form.name.split(" ")[0] || "rowerzysto"}</strong>. Odezwiemy się pod numerem{" "}
          <strong>{form.phone}</strong>, aby potwierdzić termin{form.date ? <> na <strong>{form.date}</strong></> : null}.
        </p>
        <div className="bs-summary">
          <div><span>Sprzęt</span><strong>{EQUIP.find(x => x.id === equip).label}</strong></div>
          <div><span>Usługa</span><strong>{form.service || "do ustalenia"}</strong></div>
        </div>
        <button className="btn btn-ghost" onClick={() => { setSent(false); setForm({ name: "", phone: "", service: "", date: "", msg: "" }); setTouched(false); }}>
          Wyślij kolejne zgłoszenie
        </button>
      </div>
    );
  }

  return (
    <form className="book-card" onSubmit={submit} noValidate>
      <div className="bf-field">
        <label>Co serwisujemy?</label>
        <div className="bf-seg">
          {EQUIP.map((o) => (
            <button type="button" key={o.id}
              className={"bf-seg-btn" + (equip === o.id ? " on" : "")}
              onClick={() => { setEquip(o.id); setForm((f) => ({ ...f, service: "" })); }}>
              {Icon[o.icon]({ width: 18, height: 18 })}{o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bf-row">
        <div className="bf-field">
          <label>Imię i nazwisko *</label>
          <input value={form.name} onChange={set("name")} placeholder="Jan Kowalski"
            className={touched && form.name.trim().length < 2 ? "err" : ""} />
        </div>
        <div className="bf-field">
          <label>Telefon *</label>
          <input value={form.phone} onChange={set("phone")} placeholder="+48 600 000 000" inputMode="tel"
            className={touched && !phoneOk ? "err" : ""} />
        </div>
      </div>

      <div className="bf-row">
        <div className="bf-field">
          <label>Usługa</label>
          <CustomSelect
            value={form.service}
            onChange={(v) => setForm((f) => ({ ...f, service: v }))}
            options={[{ value: '', label: 'Wybierz usługę…' }, ...optsFor(equip).map((s) => ({ value: s, label: s }))]}
          />
        </div>
        <div className="bf-field">
          <label>Preferowany termin</label>
          <CustomDatePicker
            value={form.date}
            onChange={(v) => setForm((f) => ({ ...f, date: v }))}
          />
        </div>
      </div>

      <div className="bf-field">
        <label>Wiadomość <span className="muted">(opcjonalnie)</span></label>
        <textarea value={form.msg} onChange={set("msg")} rows={3}
          placeholder={`Opisz krótko model i objawy, np. „Trek Domane, przeskakuje przerzutka tylna".`} />
      </div>

      {touched && !valid && (
        <div className="bf-error">Uzupełnij imię i poprawny numer telefonu, żeby wysłać zgłoszenie.</div>
      )}

      <button type="submit" className="btn btn-primary btn-lg bf-submit">
        Wyślij zgłoszenie {Icon.send({ width: 18, height: 18 })}
      </button>
      <p className="bf-fine muted">Zadzwonimy, aby potwierdzić termin. Bez zobowiązań - wycena na miejscu jest bezpłatna.</p>
    </form>
  );
}

function Booking({ c }) {
  const b = c.booking;
  return (
    <section className="section booking" id="rezerwacja">
      <div className="wrap booking-grid">
        <div className="booking-left">
          <div className="eyebrow"><SheriffStar size={14} /> {b.eyebrow}</div>
          <h2 className="booking-title"><AccentTitle text={b.title} /></h2>
          <p className="booking-lead">{b.lead}</p>
          <ul className="booking-perks">
            {b.perks.map((p, i) => <li key={i}>{Icon.check({ width: 18, height: 18 })} {p}</li>)}
          </ul>
          <div className="booking-call">
            <span className="muted">Wolisz zadzwonić?</span>
            <a className="booking-phone" href={"tel:" + c.brand.phoneHref}>{Icon.phone({ width: 18, height: 18 })} {c.brand.phone}</a>
          </div>
        </div>
        <BookingForm c={c} />
      </div>
    </section>
  );
}

function Footer({ c }) {
  const ct = c.contact;
  return (
    <footer className="footer" id="kontakt">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <a className="brand" href="#top">
            <img className="brand-logo" src={ASSET_BASE + "assets/favicon.png"} alt={c.brand.name} width="44" height="44" />
            <span className="name" style={{ color: "#fff" }}>{c.brand.name}<small style={{ color: "#9C9387" }}>{c.brand.tagline}</small></span>
          </a>
          <p className="footer-blurb">{ct.blurb}</p>
          <div className="footer-social">
            {ct.social.facebook && <a href={ct.social.facebook} target="_blank" rel="noopener" aria-label="Facebook">{Icon.fb({ width: 20, height: 20 })}</a>}
            {ct.social.instagram && <a href={ct.social.instagram} target="_blank" rel="noopener" aria-label="Instagram">{Icon.ig({ width: 20, height: 20 })}</a>}
            {ct.social.google && <a href={ct.social.google} target="_blank" rel="noopener" aria-label="Google">{Icon.google({ width: 20, height: 20 })}</a>}
          </div>
        </div>

        <div className="footer-col">
          <h5>Kontakt</h5>
          <a href={ct.social.google || "#"} target="_blank" rel="noopener" className="footer-line">{Icon.pin({ width: 16, height: 16 })} {ct.address}<br/><span>{ct.city}</span></a>
          <a href={"tel:" + c.brand.phoneHref} className="footer-line">{Icon.phone({ width: 16, height: 16 })} {c.brand.phone}</a>
        </div>

        <div className="footer-col">
          <h5>Godziny otwarcia</h5>
          <div className="footer-hours">
            {ct.hours.map((row, i) => (
              <div key={i}><span>{row.d}</span><strong className={row.closed ? "closed" : ""}>{row.h}</strong></div>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h5>Usługi</h5>
          <a href="#uslugi" className="footer-link">Serwis rowerowy</a>
          <a href="#zima" className="footer-link">Serwis nart i snowboardu</a>
          <a href="#galeria" className="footer-link">Galeria</a>
          <a href="#rezerwacja" className="footer-link">Umów wizytę</a>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} {c.brand.name} · Serwis rowerowy Gdańsk</span>
        <span className="footer-made">Zrobione z {Icon.wrench({ width: 14, height: 14, style: { display: "inline", verticalAlign: "-2px" } })} i pasją do dwóch kółek</span>
      </div>
    </footer>
  );
}

export { Gallery, Booking, Footer };
