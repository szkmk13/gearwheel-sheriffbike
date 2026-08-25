import React from 'react';
import { API_BASE } from '../../api-base.js';

// One fetch per page load, shared by every consumer. The chip and the modal
// both want this data and the hero renders before the modal exists, so the
// promise is kept at module scope rather than in component state.
let inflight = null;

function load() {
  if (!inflight) {
    inflight = fetch(`${API_BASE}/reviews/`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return inflight;
}

/**
 * Google reviews for the landing page.
 *
 * Returns { rating, total, mapsUrl, reviews, loading }. Everything is null or
 * empty until the request lands, and stays that way if the backend has no key
 * configured or Google is unreachable - callers fall back to the copy in
 * content-data.js rather than rendering a hole in the page.
 */
export function useGoogleReviews() {
  const [state, setState] = React.useState({ loading: true, data: null });

  React.useEffect(() => {
    let alive = true;
    load().then((data) => { if (alive) setState({ loading: false, data }); });
    return () => { alive = false; };
  }, []);

  const d = state.data;
  const usable = d && d.source === 'google';

  return {
    loading: state.loading,
    rating: usable ? d.rating : null,
    total: usable ? d.total : null,
    mapsUrl: (d && d.maps_url) || '',
    reviews: usable && Array.isArray(d.reviews) ? d.reviews : [],
  };
}
