import React from 'react';
import { SheriffStar, Icon } from './Icons.jsx';
import { AccentTitle } from './Hero.jsx';
import { CustomSelect } from './CustomSelect.jsx';
import { CustomDatePicker } from './CustomDatePicker.jsx';
import { BTN_PRIMARY, BTN_GHOST, BTN_LG } from './buttonStyles.js';

const ASSET_BASE = import.meta.env.BASE_URL;

function Gallery({ c }) {
  const g = c.gallery;
  const tiles = (g.tiles || []).filter((t) => t.url);
  if (tiles.length === 0) return null;
  return (
    <section className="py-[clamp(64px,9vw,132px)]" id="galeria">
      <div className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,64px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent-deep"><SheriffStar size={14} /> {g.eyebrow}</div>
            <h2 className="mt-[18px] text-[clamp(34px,5.2vw,60px)] font-black uppercase leading-[0.92] tracking-[-0.015em]">{g.title}</h2>
          </div>
        </div>
        <div className="mt-[clamp(34px,4vw,52px)] grid grid-cols-4 auto-rows-[200px] gap-[14px] max-[720px]:grid-cols-2 max-[720px]:auto-rows-[160px]">
          {tiles.map((t) => (
            <div
              key={t.id}
              className={
                "h-full w-full overflow-hidden rounded-2xl shadow-sm " +
                (t.span === "tall" ? "row-span-2" : "") +
                (t.span === "wide" ? " col-span-2" : "")
              }
            >
              <img className="block h-full w-full object-cover" src={t.url} alt="" loading="lazy" />
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

const FIELD_INPUT = "w-full rounded-[11px] border-[1.5px] border-line-2 bg-paper-2 px-[15px] py-[13px] text-[15px] text-ink transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_4px_var(--color-accent-soft)]";
const FIELD_ERR = "border-[#C0392B] shadow-[0_0_0_4px_rgba(192,57,43,.1)]";

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
      <div className="flex flex-col items-center gap-[14px] rounded-[22px] border border-line bg-paper p-[clamp(24px,3vw,36px)] text-center shadow-lg">
        <div className="animate-pop text-accent"><SheriffStar size={46} /></div>
        <h3 className="text-[28px] font-extrabold">Zgłoszenie przyjęte!</h3>
        <p className="max-w-[30em] text-[15.5px] text-ink-2">
          Dzięki, <strong>{form.name.split(" ")[0] || "rowerzysto"}</strong>. Odezwiemy się pod numerem{" "}
          <strong>{form.phone}</strong>, aby potwierdzić termin{form.date ? <> na <strong>{form.date}</strong></> : null}.
        </p>
        <div className="my-1.5 mb-2.5 flex w-full gap-3 max-[720px]:flex-col">
          <div className="flex flex-1 flex-col gap-[5px] rounded-xl border border-line bg-paper-2 p-3.5">
            <span className="text-[11.5px] font-bold uppercase tracking-[.1em] text-ink-3">Sprzęt</span>
            <strong className="text-[15px]">{EQUIP.find(x => x.id === equip).label}</strong>
          </div>
          <div className="flex flex-1 flex-col gap-[5px] rounded-xl border border-line bg-paper-2 p-3.5">
            <span className="text-[11.5px] font-bold uppercase tracking-[.1em] text-ink-3">Usługa</span>
            <strong className="text-[15px]">{form.service || "do ustalenia"}</strong>
          </div>
        </div>
        <button className={BTN_GHOST} onClick={() => { setSent(false); setForm({ name: "", phone: "", service: "", date: "", msg: "" }); setTouched(false); }}>
          Wyślij kolejne zgłoszenie
        </button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-[18px] rounded-[22px] border border-line bg-paper p-[clamp(24px,3vw,36px)] shadow-lg" onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Co serwisujemy?</label>
        <div className="grid grid-cols-2 gap-2 max-[420px]:grid-cols-1">
          {EQUIP.map((o) => {
            const EquipIcon = Icon[o.icon];
            const on = equip === o.id;
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => { setEquip(o.id); setForm((f) => ({ ...f, service: "" })); }}
                className={
                  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[11px] border-[1.5px] text-[14.5px] font-semibold transition-colors " +
                  (on ? "border-accent bg-accent-soft text-accent-deep" : "border-line-2 bg-paper-2 text-ink-2 hover:border-ink-3")
                }
              >
                <EquipIcon width={18} height={18} className={on ? "text-accent" : "text-ink-3"} />{o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Imię i nazwisko *</label>
          <input
            value={form.name} onChange={set("name")} placeholder="Jan Kowalski"
            className={FIELD_INPUT + (touched && form.name.trim().length < 2 ? " " + FIELD_ERR : "")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Telefon *</label>
          <input
            value={form.phone} onChange={set("phone")} placeholder="+48 600 000 000" inputMode="tel"
            className={FIELD_INPUT + (touched && !phoneOk ? " " + FIELD_ERR : "")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Usługa</label>
          <CustomSelect
            value={form.service}
            onChange={(v) => setForm((f) => ({ ...f, service: v }))}
            options={[{ value: '', label: 'Wybierz usługę…' }, ...optsFor(equip).map((s) => ({ value: s, label: s }))]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Preferowany termin</label>
          <CustomDatePicker
            value={form.date}
            onChange={(v) => setForm((f) => ({ ...f, date: v }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-bold tracking-[.01em] text-ink-2">Wiadomość <span className="text-ink-3">(opcjonalnie)</span></label>
        <textarea
          value={form.msg} onChange={set("msg")} rows={3}
          placeholder={`Opisz krótko model i objawy, np. „Trek Domane, przeskakuje przerzutka tylna".`}
          className={FIELD_INPUT + " min-h-[84px] resize-y"}
        />
      </div>

      {touched && !valid && (
        <div className="rounded-[10px] border border-[rgba(192,57,43,.25)] bg-[rgba(192,57,43,.08)] px-[14px] py-[11px] text-[13.5px] font-semibold text-[#A0301F]">
          Uzupełnij imię i poprawny numer telefonu, żeby wysłać zgłoszenie.
        </div>
      )}

      <button type="submit" className={BTN_PRIMARY + " " + BTN_LG + " mt-1 w-full"}>
        Wyślij zgłoszenie <Icon.send width={18} height={18} />
      </button>
      <p className="text-center text-[12.5px] leading-[1.4] text-ink-3">Zadzwonimy, aby potwierdzić termin. Bez zobowiązań - wycena na miejscu jest bezpłatna.</p>
    </form>
  );
}

function Booking({ c }) {
  const b = c.booking;
  return (
    <section className="border-t border-line bg-paper-2 py-[clamp(64px,9vw,132px)]" id="rezerwacja">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[0.92fr_1.08fr] items-start gap-[clamp(36px,5vw,72px)] px-[clamp(20px,5vw,64px)] max-[1000px]:grid-cols-1">
        <div>
          <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent-deep"><SheriffStar size={14} /> {b.eyebrow}</div>
          <h2 className="mt-[18px] text-[clamp(34px,4.4vw,56px)] font-black uppercase leading-[0.92] tracking-[-0.015em]"><AccentTitle text={b.title} /></h2>
          <p className="mt-5 max-w-[26em] text-[17px] text-ink-2">{b.lead}</p>
          <ul className="mt-7 flex list-none flex-col gap-[13px] p-0">
            {b.perks.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] font-medium text-ink"><Icon.check width={18} height={18} className="flex-none text-accent" /> {p}</li>
            ))}
          </ul>
          <div className="mt-[34px] flex flex-col gap-1.5 border-t border-line pt-[26px]">
            <span className="text-[13.5px] text-ink-3">Wolisz zadzwonić?</span>
            <a className="inline-flex items-center gap-2.5 font-brand text-[26px] font-extrabold" href={"tel:" + c.brand.phoneHref}><Icon.phone width={18} height={18} className="text-accent" /> {c.brand.phone}</a>
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
    <footer className="bg-ink text-[#E9E2D7]" id="kontakt">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.6fr_1fr] gap-12 px-[clamp(20px,5vw,64px)] py-[clamp(54px,7vw,84px)] pb-10 max-[1000px]:grid-cols-1 max-[1000px]:gap-9">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-10 max-[1000px]:grid-cols-2 max-[720px]:grid-cols-1 max-[720px]:gap-8">
          <div className="max-w-[320px]">
            <a className="flex items-center gap-[11px]" href="#top">
              <img className="h-11 w-11 rounded-[9px] object-cover ring-1 ring-white/10" src={ASSET_BASE + "assets/favicon.png"} alt={c.brand.name} width="44" height="44" />
              <span className="font-brand text-[21px] font-black uppercase leading-none text-white">
                {c.brand.name}
                <small className="mt-[3px] block text-[9.5px] tracking-[.42em] text-[#9C9387]">{c.brand.tagline}</small>
              </span>
            </a>
            <p className="mt-5 text-[14.5px] leading-[1.6] text-[#B5AB9D]">{ct.blurb}</p>
            <div className="mt-[22px] flex gap-2.5">
              {ct.social.facebook && <a href={ct.social.facebook} target="_blank" rel="noopener" aria-label="Facebook" className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[.06] text-[#D8CFC2] transition-all hover:-translate-y-[3px] hover:bg-accent hover:text-white"><Icon.fb width={20} height={20} /></a>}
              {ct.social.instagram && <a href={ct.social.instagram} target="_blank" rel="noopener" aria-label="Instagram" className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[.06] text-[#D8CFC2] transition-all hover:-translate-y-[3px] hover:bg-accent hover:text-white"><Icon.ig width={20} height={20} /></a>}
              {ct.social.google && <a href={ct.social.google} target="_blank" rel="noopener" aria-label="Google" className="grid h-[42px] w-[42px] place-items-center rounded-[11px] bg-white/[.06] text-[#D8CFC2] transition-all hover:-translate-y-[3px] hover:bg-accent hover:text-white"><Icon.google width={20} height={20} /></a>}
            </div>
          </div>

          <div>
            <h5 className="mb-[18px] text-xs font-bold uppercase tracking-[.14em] text-[#8C8377]">Kontakt</h5>
            <a href={ct.social.google || "#"} target="_blank" rel="noopener" className="mb-[14px] flex items-start gap-[9px] text-[14.5px] leading-[1.5] text-[#C9BFB1] hover:text-white">
              <Icon.pin width={16} height={16} className="mt-[3px] flex-none text-accent" /> {ct.address}<br /><span className="text-[#968D81]">{ct.city}</span>
            </a>
            <a href={"tel:" + c.brand.phoneHref} className="mb-[14px] flex items-start gap-[9px] text-[14.5px] leading-[1.5] text-[#C9BFB1] hover:text-white">
              <Icon.phone width={16} height={16} className="mt-[3px] flex-none text-accent" /> {c.brand.phone}
            </a>
          </div>

          <div>
            <h5 className="mb-[18px] text-xs font-bold uppercase tracking-[.14em] text-[#8C8377]">Godziny otwarcia</h5>
            <div>
              {ct.hours.map((row, i) => (
                <div key={i} className="flex justify-between gap-3.5 border-b border-white/[.07] py-[7px] text-sm">
                  <span className="text-[#968D81]">{row.d}</span>
                  <strong className={"font-semibold " + (row.closed ? "text-[#8C8377]" : "text-[#E9E2D7]")}>{row.h}</strong>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-[18px] text-xs font-bold uppercase tracking-[.14em] text-[#8C8377]">Usługi</h5>
            <a href="#uslugi" className="mb-3 block text-[14.5px] text-[#C9BFB1] transition-colors hover:text-white">Serwis rowerowy</a>
            <a href="#zima" className="mb-3 block text-[14.5px] text-[#C9BFB1] transition-colors hover:text-white">Serwis nart i snowboardu</a>
            <a href="#galeria" className="mb-3 block text-[14.5px] text-[#C9BFB1] transition-colors hover:text-white">Galeria</a>
            <a href="#rezerwacja" className="mb-3 block text-[14.5px] text-[#C9BFB1] transition-colors hover:text-white">Umów wizytę</a>
          </div>
        </div>

        <div className="min-h-[260px] overflow-hidden rounded-2xl border border-white/[.08] max-[1000px]:min-h-[300px]">
          <iframe
            className="block h-full min-h-[260px] w-full"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d18610.66088122194!2d18.5526215!3d54.3334291!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x46fd752771307cb3%3A0xbbcd0ea7c51a49a3!2sSheriff%20Bike%20-%20serwis%20rowerowy%20Gda%C5%84sk!5e0!3m2!1spl!2spl!4v1784991164389!5m2!1spl!2spl"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Mapa - Sheriff Bike Gdańsk"
          />
        </div>
      </div>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/[.08] px-[clamp(20px,5vw,64px)] py-[22px] text-[13px] text-[#8C8377] max-w-[1240px]">
        <span>© {new Date().getFullYear()} {c.brand.name} · Serwis rowerowy Gdańsk</span>
        <span className="inline-flex items-center gap-1.5">Zrobione z <Icon.wrench width={14} height={14} style={{ display: "inline", verticalAlign: "-2px" }} /> i pasją do dwóch kółek</span>
      </div>
    </footer>
  );
}

export { Gallery, Booking, Footer };
