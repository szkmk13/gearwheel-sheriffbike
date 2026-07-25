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
  const onBook = (e) => {
    e.preventDefault();
    prefillBooking("rower", s.title);
    document.getElementById("rezerwacja").scrollIntoView({ behavior: "smooth" });
  };
  const ServiceIcon = Icon[s.icon] || Icon.wrench;
  return (
    <article
      className={
        "group/card relative flex flex-col rounded-[22px] border p-[24px_22px_20px] transition duration-[220ms] hover:-translate-y-1 hover:shadow-lg " +
        (s.featured ? "border-ink bg-ink text-white" : "border-line bg-paper-2 hover:border-line-2")
      }
    >
      {s.featured && (
        <div className="absolute right-[18px] top-[18px] inline-flex items-center gap-[5px] rounded-full bg-accent py-[5px] pl-[9px] pr-[11px] text-[11px] font-bold uppercase tracking-[.06em] text-white">
          <SheriffStar size={12} /> Polecany
        </div>
      )}
      <div className={"mb-4 flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-xl " + (s.featured ? "bg-[color-mix(in_oklab,var(--color-accent)_26%,transparent)] text-white" : "bg-accent-soft text-accent-deep")}>
        <ServiceIcon width={24} height={24} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[19px] font-bold tracking-[-.01em]">{s.title}</h3>
        {s.price && <span className={"flex-none text-sm font-bold " + (s.featured ? "text-gold" : "text-accent-deep")}>{s.price}</span>}
      </div>
      <p className={"mt-2.5 text-[13.5px] leading-[1.5] " + (s.featured ? "text-white/75" : "text-ink-2")}>{s.desc}</p>
      {!!(s.points && s.points.length) && (
        <div className="group/scope mt-3.5 outline-none" tabIndex={0}>
          <div className="flex items-center justify-between py-1 text-[12.5px] font-bold">
            <span>Zakres usługi</span>
            <span className={"inline-flex transition-transform duration-200 group-hover/card:rotate-90 group-focus/scope:rotate-90 group-focus-within/scope:rotate-90 " + (s.featured ? "text-gold" : "text-accent")}>
              <Icon.arrow width={14} height={14} />
            </span>
          </div>
          <ul
            className={
              "m-0 flex list-none flex-col gap-2 overflow-hidden p-0 opacity-0 max-h-0 transition-all duration-300 " +
              "group-hover/card:mt-2 group-hover/card:max-h-[400px] group-hover/card:opacity-100 " +
              "group-focus/scope:mt-2 group-focus/scope:max-h-[400px] group-focus/scope:opacity-100 " +
              "group-focus-within/scope:mt-2 group-focus-within/scope:max-h-[400px] group-focus-within/scope:opacity-100"
            }
          >
            {s.points.map((p, i) => (
              <li key={i} className={"flex items-start gap-[9px] text-[12.5px] " + (s.featured ? "text-white/85" : "text-ink-2")}>
                <Icon.check width={15} height={15} className={"mt-px flex-none " + (s.featured ? "text-gold" : "text-accent")} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <a
        href="#rezerwacja"
        onClick={onBook}
        className={"mt-auto inline-flex items-center gap-2 pt-[18px] text-[13.5px] font-bold " + (s.featured ? "text-white" : "text-ink")}
      >
        Umów <Icon.arrow width={16} height={16} className="transition-transform duration-200 group-hover/card:translate-x-1" />
      </a>
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
          <h2 className="mt-[18px] text-[clamp(34px,5.2vw,60px)] font-black uppercase leading-[0.92] tracking-[-0.015em]"><AccentTitle text={s.title} /></h2>
          {(Array.isArray(s.lead) ? s.lead : [s.lead]).map((p, i) => (
            <p className="mt-5 max-w-[580px] text-[clamp(17px,1.5vw,19px)] text-ink-2" key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-4 gap-4 max-[1180px]:grid-cols-3 max-[1000px]:grid-cols-2 max-[720px]:grid-cols-1">
          {s.items.map((it, i) => <ServiceCard key={i} s={it} />)}
          <article className="flex flex-col items-start gap-1 rounded-[22px] border p-[24px_22px_20px] border-[color-mix(in_oklab,var(--color-accent)_22%,var(--color-line))] bg-accent-soft">
            <SheriffStar size={40} className="mb-4 text-accent" />
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
          <h2 className="mt-[18px] text-[clamp(36px,4.6vw,62px)] font-black uppercase leading-[0.92] tracking-[-0.015em] text-white"><AccentTitle text={w.title} /></h2>
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
