/**
 * ContactSpeedDial — a floating, multi-action contact control for the public
 * landing of مراكز الأوائل. Replaces the single-purpose WhatsApp FAB with a
 * speed-dial that expands upward into a vertical stack of labelled actions:
 *
 *   احجز تقييم  → calls the `onBook` prop (opens the booking modal)
 *   اتصل بنا    → tel: link to the main center phone
 *   الاتجاهات   → Google Maps directions to the main center address
 *   واتساب      → WhatsApp chat with the prefilled appointment template
 *
 * Fully keyboard-accessible (Escape closes), RTL, ARIA-labelled, on-brand,
 * with smooth open/close motion. Closes on outside click + Escape.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import content, { isEn, tr } from '../../data/landingContentActive';
import { openWhatsApp } from '../../data/whatsappLink';

/* Inline SVG icons (Heroicons-outline style, currentColor) */
function IconCalendar() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}
function IconWhatsApp() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg
      className="w-7 h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}
function IconClose() {
  return (
    <svg
      className="w-7 h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* A single labelled speed-dial action row. */
function Action({ as = 'a', label, icon, colorClass, delay, open, ...rest }) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      aria-label={label}
      className={`flex items-center justify-end gap-3 transition-all duration-300 ${
        open
          ? 'pointer-events-auto opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 translate-y-3'
      }`}
      style={{ transitionDelay: open ? `${delay}ms` : '0ms' }}
    >
      <span className="rounded-lg bg-gray-900/85 px-3 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
        {label}
      </span>
      <span
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-xl transition-transform duration-200 hover:scale-110 ${colorClass}`}
        aria-hidden="true"
      >
        {icon}
      </span>
    </Tag>
  );
}

export default function ContactSpeedDial({ onBook }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const ap = content.appointment;
  const c = content.contact;
  const whatsappUrl = `https://wa.me/${ap.whatsappNumber}?text=${encodeURIComponent(ap.whatsappTemplate)}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.mainAddress)}`;

  // Escape closes the speed-dial
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Outside click closes the speed-dial
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const handleBook = useCallback(() => {
    setOpen(false);
    if (typeof onBook === 'function') onBook();
  }, [onBook]);

  return (
    <div
      ref={rootRef}
      dir={isEn ? 'ltr' : 'rtl'}
      className="fixed bottom-6 left-6 z-40 hidden flex-col items-end gap-3 sm:flex"
    >
      {/* Actions stack — top to bottom: book, call, directions, whatsapp */}
      <div className={`flex flex-col items-end gap-3 ${open ? '' : 'pointer-events-none'}`}>
        <Action
          as="button"
          type="button"
          onClick={handleBook}
          label={tr('احجز تقييم', 'Book Assessment')}
          icon={<IconCalendar />}
          colorClass="bg-gradient-to-br from-accent-500 to-accent-700"
          delay={90}
          open={open}
        />
        <Action
          as="a"
          href={`tel:${c.mainPhone}`}
          onClick={() => setOpen(false)}
          label={tr('اتصل بنا', 'Call Us')}
          icon={<IconPhone />}
          colorClass="bg-gradient-to-br from-primary-600 to-primary-800"
          delay={60}
          open={open}
        />
        <Action
          as="a"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          label={tr('الاتجاهات', 'Directions')}
          icon={<IconMapPin />}
          colorClass="bg-gradient-to-br from-green-600 to-green-800"
          delay={30}
          open={open}
        />
        <Action
          as="a"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => {
            // Open the WhatsApp app directly (skip the wa.me interstitial)
            e.preventDefault();
            setOpen(false);
            openWhatsApp(ap.whatsappNumber, ap.whatsappTemplate);
          }}
          label={tr('واتساب', 'WhatsApp')}
          icon={<IconWhatsApp />}
          colorClass="bg-[#25D366]"
          delay={0}
          open={open}
        />
      </div>

      {/* Main FAB — toggles the speed-dial open/closed */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={
          open ? tr('إغلاق قائمة التواصل', 'Close contact menu') : tr('تواصل معنا', 'Contact us')
        }
        title={tr('تواصل معنا', 'Contact us')}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-2xl shadow-primary-900/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-primary-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <span
          className={`flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-90' : 'rotate-0'}`}
        >
          {open ? <IconClose /> : <IconChat />}
        </span>
      </button>
    </div>
  );
}
