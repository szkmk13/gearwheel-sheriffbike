import React from 'react';
import { SheriffStar, Icon } from './icons.jsx';
import { AccentTitle } from './hero.jsx';

function ServiceCard({ s }) {
  return (
    <article className={"svc-card" + (s.featured ? " featured" : "")}>
      {s.featured && <div className="svc-ribbon"><SheriffStar size={12} /> Polecany</div>}
      <div className="svc-icon">{(Icon[s.icon] || Icon.wrench)({ width: 24, height: 24 })}</div>
      <div className="svc-tag">{s.tag}</div>
      <div className="svc-head-row">
        <h3 className="svc-title">{s.title}</h3>
        {s.price && <span className="svc-price">{s.price}</span>}
      </div>
      <p className="svc-desc">{s.desc}</p>
      {!!(s.points && s.points.length) && (
        <details className="svc-details">
          <summary className="svc-summary">
            <span>Zakres usługi</span>
            <span className="svc-chev">{Icon.arrow({ width: 14, height: 14 })}</span>
          </summary>
          <ul className="svc-points">
            {s.points.map((p, i) => (
              <li key={i}>{Icon.check({ width: 15, height: 15 })}<span>{p}</span></li>
            ))}
          </ul>
        </details>
      )}
      <a className="svc-link" href="#rezerwacja">Umów <span>{s.title.toLowerCase()}</span> {Icon.arrow({ width: 16, height: 16 })}</a>
    </article>
  );
}

function Services({ c }) {
  const s = c.services;
  return (
    <section className="section services" id="uslugi">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow"><SheriffStar size={14} /> {s.eyebrow}</div>
          <h2><AccentTitle text={s.title} /></h2>
          <p className="lead">{s.lead}</p>
        </div>

        <div className="svc-grid">
          {s.items.map((it, i) => <ServiceCard key={i} s={it} />)}
          <article className="svc-card svc-cta-card">
            <SheriffStar size={40} className="sheriff-star" />
            <h3 className="svc-title">{s.ctaTitle}</h3>
            <p className="svc-desc">{s.ctaDesc}</p>
            <a className="btn btn-dark" href="#rezerwacja">Zapytaj o wycenę {Icon.arrow()}</a>
          </article>
        </div>
      </div>
    </section>
  );
}

function Winter({ c }) {
  const w = c.winter;
  return (
    <section className="section winter" id="zima">
      <div className="winter-glow" />
      <div className="wrap winter-inner">
        <div className="winter-left">
          <div className="eyebrow on-winter"><SheriffStar size={14} /> {w.eyebrow}</div>
          <h2 className="winter-title display"><AccentTitle text={w.title} /></h2>
          <p className="winter-lead">{w.lead}</p>
          <div className="winter-actions">
            <a className="btn btn-primary btn-lg" href="#rezerwacja">{w.cta} {Icon.arrow()}</a>
          </div>
        </div>
        <div className="winter-right">
          {w.items.map((it, i) => (
            <div className="winter-card" key={i}>
              <div className="winter-card-ic">{(Icon[it.icon] || Icon.ski)({ width: 24, height: 24 })}</div>
              <div>
                <h4 className="winter-card-title">{it.title}</h4>
                <p className="winter-card-desc">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { Services, Winter };
