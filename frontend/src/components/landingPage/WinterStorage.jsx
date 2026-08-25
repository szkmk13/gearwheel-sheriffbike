import React from 'react';
import { SheriffStar, Icon } from './Icons.jsx';
import { AccentTitle } from './Hero.jsx';
import { BTN_PRIMARY, BTN_LG } from './buttonStyles.js';
import { prefillBooking } from './bookingPrefill.js';

/**
 * Winter bike storage - the bridge between the bike services above and the
 * ski/snowboard section below.
 *
 * Deliberately light (bg-paper-3): Winter sits immediately below on the dark
 * winter-bg, and its impact comes from being the page's first dark band. A
 * dark section here would spend that effect early.
 */
function WinterStorage({ c }) {
  const s = c.storage;

  return (
    <section className="border-y border-line bg-paper-3 py-[clamp(56px,8vw,110px)]" id="zimowanie">
      <div className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,64px)]">
        <div className="max-w-[720px]">
          <div className="inline-flex items-center gap-[9px] text-[12.5px] font-bold uppercase tracking-[0.18em] text-accent-deep">
            <SheriffStar size={14} /> {s.eyebrow}
          </div>
          <h2 className="mt-[18px] text-[clamp(34px,5.2vw,60px)] font-brand font-black uppercase leading-[0.9] tracking-[0.01em]">
            <AccentTitle text={s.title} />
          </h2>
          <p className="mt-5 max-w-[580px] text-[clamp(17px,1.5vw,19px)] text-ink-2">{s.lead}</p>
        </div>

        <div className="relative mt-[clamp(40px,5vw,64px)]">
          {/* One line spanning first to last step centre. With four equal
              columns those centres sit at 12.5% and 87.5% of the row, so this
              stays aligned at any width without per-step maths. Purely
              decorative, hence the low-contrast winter tint. */}
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[27px] h-0.5 bg-winter-ice/45 max-[900px]:hidden" />

          <ol className="grid grid-cols-4 gap-6 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1 max-[900px]:gap-8">
            {s.steps.map((st, i) => {
              const StepIcon = Icon[st.icon] || Icon.check;
              return (
                <li key={i} className="flex flex-col items-center text-center max-[560px]:flex-row max-[560px]:items-start max-[560px]:gap-4 max-[560px]:text-left">
                  <span className="relative z-[1] flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full border-[1.5px] border-line-2 bg-paper-2 text-accent">
                    <StepIcon width={24} height={24} />
                  </span>
                  <div>
                    <div className="mt-4 text-[12px] font-bold uppercase tracking-[.16em] text-accent max-[560px]:mt-0">
                      Krok {i + 1}
                    </div>
                    <h3 className="mt-1.5 text-[17.5px] font-bold">{st.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.55] text-ink-2">{st.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-[clamp(40px,5vw,60px)] flex flex-wrap items-center justify-between gap-6 rounded-[22px] border border-[color-mix(in_oklab,var(--color-accent)_22%,var(--color-line))] bg-accent-soft p-[clamp(22px,3vw,32px)]">
          <div>
            <div className="flex items-baseline gap-2.5">
              <strong className="font-brand text-[clamp(34px,4vw,46px)] font-black leading-none">{s.price}</strong>
              <span className="text-[14.5px] font-semibold text-ink-2">{s.priceNote}</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {s.perks.map((p, i) => (
                <li key={i} className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-ink-2">
                  <Icon.check width={16} height={16} className="text-accent" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className={BTN_PRIMARY + " " + BTN_LG + " max-[560px]:w-full"}
            onClick={() => prefillBooking({ equip: "rower", service: s.service })}
          >
            {s.cta} <Icon.arrow />
          </button>
        </div>
      </div>
    </section>
  );
}

export { WinterStorage };
