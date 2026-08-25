import React from 'react';
import { SheriffStar, Icon } from './Icons.jsx';
import { AccentTitle } from './Hero.jsx';
import { BTN_DARK, BTN_PRIMARY, BTN_LG } from './buttonStyles.js';

function prefillBooking(equip, service) {
  try {
    sessionStorage.setItem("sheriff:prefill", JSON.stringify({ equip, service }));
    window.dispatchEvent(new CustomEvent("sheriff:prefill", { detail: { equip, service } }));
  } catch (e) {}
}

function ServiceCard({ s }) {
  const [open, setOpen] = React.useState(false);
  const onBook = (e) => {
    e.preventDefault();
    prefillBooking("rower", s.title);
    document.getElementById("rezerwacja").scrollIntoView({ behavior: "smooth" });
  };
  const ServiceIcon = Icon[s.icon] || Icon.wrench;
  const hasPoints = !!(s.points && s.points.length);
  return (
    <article
      className={
        "group/card flex flex-col rounded-[22px] border p-[22px] transition duration-[220ms] hover:-translate-y-1 hover:shadow-lg " +
        (s.featured ? "border-ink bg-ink text-white" : "border-line bg-paper-2 hover:border-line-2")
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {s.featured && (
          <span className="inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-white">
            <SheriffStar size={11} /> Polecany
          </span>
        )}
        {s.tag && (
          <span className={"inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] " + (s.featured ? "bg-white/10 text-white/80" : "bg-accent-soft text-accent-deep")}>
            <ServiceIcon width={12} height={12} /> {s.tag}
          </span>
        )}
        {s.price && <span className={"ml-auto flex-none text-sm font-bold " + (s.featured ? "text-gold" : "text-accent-deep")}>{s.price}</span>}
      </div>
      <h3 className="mt-3 text-[19px] font-bold leading-snug tracking-[-.01em]">{s.title}</h3>
      <p className={"mt-2 text-[13.5px] leading-[1.5] " + (s.featured ? "text-white/75" : "text-ink-2")}>{s.desc}</p>
      <div className="mt-auto">
        <div className="flex items-center justify-between gap-2 pt-[18px]">
          {hasPoints ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={
                "-ml-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-[12.5px] font-bold transition-colors " +
                (s.featured ? "hover:bg-white/10" : "hover:bg-accent-soft/60")
              }
            >
              <span>Zakres usługi</span>
              <span className={"inline-flex transition-transform duration-200 " + (open ? "rotate-180" : "") + " " + (s.featured ? "text-gold" : "text-accent")}>
                <Icon.chevron width={14} height={14} />
              </span>
            </button>
          ) : <span />}
          <a
            href="#rezerwacja"
            onClick={onBook}
            className={"inline-flex items-center gap-2 text-[13.5px] font-bold " + (s.featured ? "text-white" : "text-ink")}
          >
            Umów <Icon.arrow width={16} height={16} className="transition-transform duration-200 group-hover/card:translate-x-1" />
          </a>
        </div>
        {hasPoints && (
          <ul
            className={
              "m-0 flex list-none flex-col gap-2 overflow-hidden p-0 transition-all duration-300 " +
              (open ? "mt-2 max-h-[400px] opacity-100" : "max-h-0 opacity-0")
            }
          >
            {s.points.map((p, i) => (
              <li key={i} className={"flex items-start gap-[9px] text-[12.5px] " + (s.featured ? "text-white/85" : "text-ink-2")}>
                <Icon.check width={15} height={15} className={"mt-px flex-none " + (s.featured ? "text-gold" : "text-accent")} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Services({ c }) {
  const s = c.services;
  return (
    <section className="py-[clamp(64px,9vw,132px)]" id="uslugi">
      <div className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[720px]">
          <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent-deep"><SheriffStar size={14} /> {s.eyebrow}</div>
          <h2 className="mt-[18px] text-[clamp(34px,5.2vw,60px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em]"><AccentTitle text={s.title} /></h2>
          {(Array.isArray(s.lead) ? s.lead : [s.lead]).map((p, i) => (
            <p className="mt-5 max-w-[580px] text-[clamp(17px,1.5vw,19px)] text-ink-2" key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-4 gap-4 max-[1180px]:grid-cols-3 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
          {s.items.map((it, i) => <ServiceCard key={i} s={it} />)}
          <article className="flex flex-col items-start gap-1 rounded-[22px] border p-[22px] border-[color-mix(in_oklab,var(--color-accent)_22%,var(--color-line))] bg-accent-soft">
            <h3 className="text-[19px] font-bold tracking-[-.01em]">{s.ctaTitle}</h3>
            <p className="mt-2.5 text-[13.5px] leading-[1.5] text-ink-2">{s.ctaDesc}</p>
            <a className={BTN_DARK + " mt-auto"} href="#rezerwacja">Zapytaj o wycenę <Icon.arrow /></a>
          </article>
        </div>
      </div>
    </section>
  );
}

function Winter({ c }) {
  const w = c.winter;
  return (
    <section className="relative overflow-clip bg-winter-bg py-[clamp(64px,9vw,132px)] text-winter-ink" id="zima">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_12%_0%,color-mix(in_oklab,var(--color-winter-ice)_14%,transparent)_0%,transparent_60%),radial-gradient(50%_60%_at_100%_100%,color-mix(in_oklab,var(--color-accent)_16%,transparent)_0%,transparent_55%)]" />
      <div className="relative mx-auto grid max-w-[1240px] grid-cols-2 items-center gap-[clamp(36px,5vw,72px)] px-[clamp(20px,5vw,64px)] max-[1000px]:grid-cols-1">
        <div>
          <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-winter-ice"><SheriffStar size={14} /> {w.eyebrow}</div>
          <h2 className="mt-[18px] text-[clamp(36px,4.6vw,62px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em] text-white"><AccentTitle text={w.title} /></h2>
          <p className="mt-[22px] max-w-[32em] text-[clamp(16px,1.5vw,18.5px)] leading-[1.6] text-winter-mut">{w.lead}</p>
          <div className="mt-8">
            <a className={BTN_PRIMARY + " " + BTN_LG} href="#rezerwacja">{w.cta} <Icon.arrow /></a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[14px] max-[720px]:grid-cols-1">
          {w.items.map((it, i) => {
            const WinterIcon = Icon[it.icon] || Icon.ski;
            return (
              <div key={i} className="flex flex-col gap-[14px] rounded-[14px] border border-winter-ice/[.12] bg-winter-2 p-[22px_20px] transition duration-200 hover:-translate-y-[3px] hover:border-winter-ice/30 hover:bg-[#2E3A47]">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-winter-ice/[.12] text-winter-ice">
                  <WinterIcon width={24} height={24} />
                </div>
                <div>
                  <h4 className="text-[17px] font-bold text-white">{it.title}</h4>
                  <p className="mt-[7px] text-[13.5px] leading-[1.5] text-winter-mut">{it.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { Services, Winter };
