/**
 * WhatsApp deep-linking helpers.
 *
 * Goal: open the WhatsApp APP directly (skip the wa.me "Continue to Chat"
 * interstitial). On mobile we use the native `whatsapp://send` scheme which
 * launches the installed app immediately; if the app isn't installed we fall
 * back to wa.me after a short grace period. On desktop we open wa.me (which
 * hands off to WhatsApp Desktop / Web) in a new tab.
 */

/** Web (wa.me) URL — kept as the no-JS / desktop fallback + anchor href. */
export function whatsappWebUrl(phone, text) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text || '')}`;
}

/** Native app URL — opens WhatsApp directly, no interstitial. */
export function whatsappAppUrl(phone, text) {
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text || '')}`;
}

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent || '');
}

/**
 * Open WhatsApp for the given E.164 (no +) phone + prefilled text.
 * Mobile → app directly (web fallback if not installed); desktop → wa.me tab.
 */
export function openWhatsApp(phone, text) {
  const appUrl = whatsappAppUrl(phone, text);
  const webUrl = whatsappWebUrl(phone, text);

  if (!isMobile()) {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Mobile: try the native app; if the page is still visible after a grace
  // period (app not installed / scheme not handled), fall back to wa.me.
  let handled = false;
  const onHide = () => {
    if (document.hidden) {
      handled = true;
      cleanup();
    }
  };
  function cleanup() {
    document.removeEventListener('visibilitychange', onHide);
    clearTimeout(timer);
  }
  const timer = setTimeout(() => {
    cleanup();
    if (!handled) window.location.href = webUrl;
  }, 1400);

  document.addEventListener('visibilitychange', onHide);
  window.location.href = appUrl;
}
