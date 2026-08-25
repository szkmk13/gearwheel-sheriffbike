/**
 * Preselect equipment/service in the booking form and scroll to it.
 *
 * The form lives far down the page in Footer.jsx and may not be mounted with
 * the values we want yet, so this both fires an event (for a form that's
 * already listening) and writes sessionStorage (which the form reads on mount).
 *
 * `service` must exactly match one of the options the form renders, otherwise
 * the select falls back to its blank placeholder.
 */
export function prefillBooking({ equip, service }) {
  const detail = { equip, service };
  try {
    sessionStorage.setItem('sheriff:prefill', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('sheriff:prefill', { detail }));
  } catch (e) {
    // Private-mode sessionStorage can throw - the scroll below still works,
    // the user just picks the service by hand.
  }
  const target = document.getElementById('rezerwacja');
  if (target) target.scrollIntoView({ behavior: 'smooth' });
}
