import React from 'react';

function useTurnstile(siteKey) {
  const containerRef = React.useRef(null);
  const widgetIdRef = React.useRef(null);
  const [token, setToken] = React.useState('');

  const reset = React.useCallback(() => {
    setToken('');
    if (window.turnstile && widgetIdRef.current != null) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    let pollId = null;

    const render = () => {
      if (cancelled || !window.turnstile || widgetIdRef.current != null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      pollId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollId);
          render();
        }
      }, 150);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (window.turnstile && widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return { containerRef, token, reset };
}

export { useTurnstile };
