import React from 'react';
import { DEFAULT_CONTENT } from '../content-data.js';
import { Nav, Hero, TrustStrip } from '../components/landingPage/Hero.jsx';
import { Services, Winter } from '../components/landingPage/Services.jsx';
import { Booking, Footer } from '../components/landingPage/Footer.jsx';

const c = DEFAULT_CONTENT;

function HomePage() {
  React.useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', c.theme.accent);
  }, []);

  return (
    <div className="min-h-screen bg-paper font-brand text-ink text-[17px] leading-[1.6] antialiased selection:bg-accent selection:text-white">
      <Nav c={c} />
      <Hero c={c} />
      <TrustStrip c={c} />
      <Services c={c} />
      <Winter c={c} />
      <Booking c={c} />
      <Footer c={c} />
    </div>
  );
}

export default HomePage;
