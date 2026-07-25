import React from 'react';
import { DEFAULT_CONTENT, ContentStore } from '../content-data.js';
import { Nav, Hero, TrustStrip } from '../hero.jsx';
import { Services, Winter } from '../services.jsx';
import { Gallery, Booking, Footer } from '../footer.jsx';

function HomePage() {
  const [c, setC] = React.useState(null);

  React.useEffect(() => {
    ContentStore.load().then(setC);
  }, []);

  React.useEffect(() => {
    const accent = (c && c.theme && c.theme.accent) || DEFAULT_CONTENT.theme.accent;
    document.documentElement.style.setProperty('--accent', accent);
  }, [c]);

  if (!c) return null;

  return (
    <React.Fragment>
      <Nav c={c} />
      <Hero c={c} />
      <TrustStrip c={c} />
      <Services c={c} />
      <Winter c={c} />
      <Gallery c={c} />
      <Booking c={c} />
      <Footer c={c} />
    </React.Fragment>
  );
}

export default HomePage;
