import React from 'react';
import { DEFAULT_CONTENT, ContentStore } from '../content-data.js';
import { Nav, Hero, TrustStrip } from '../components/landingPage/Hero.jsx';
import { Services, Winter } from '../components/landingPage/Services.jsx';
import { Gallery, Booking, Footer } from '../components/landingPage/Footer.jsx';

function HomePage() {
  const [c, setC] = React.useState(null);

  React.useEffect(() => {
    ContentStore.load().then(setC);
  }, []);

  React.useEffect(() => {
    const accent = (c && c.theme && c.theme.accent) || DEFAULT_CONTENT.theme.accent;
    document.documentElement.style.setProperty('--color-accent', accent);
  }, [c]);

  if (!c) return null;

  return (
    <div className="min-h-screen bg-paper font-brand text-ink text-[17px] leading-[1.6] antialiased selection:bg-accent selection:text-white">
      <Nav c={c} />
      <Hero c={c} />
      <TrustStrip c={c} />
      <Services c={c} />
      <Winter c={c} />
      <Gallery c={c} />
      <Booking c={c} />
      <Footer c={c} />
    </div>
  );
}

export default HomePage;
