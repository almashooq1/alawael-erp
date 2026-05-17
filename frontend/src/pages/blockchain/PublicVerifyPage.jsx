/**
 * Public Certificate Verification Page — صفحة التحقق العامة
 *
 * No-auth landing page for QR scans. Users hit /verify or /verify/:hash and see
 * a clear pass/fail card with the integrity breakdown (cert hash · merkle proof
 * · blockchain anchor). Designed to be readable on a phone after a QR scan.
 *
 * Inputs: route param :hash (optional) OR a search box for cert number.
 * Output: structured verdict from /api/v1/blockchain/public/verify/...
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicVerificationService } from '../../services/blockchainService';
import { formatDate as _fmtDate } from 'utils/dateUtils';

const COLORS = {
  green: '#0a7d3a',
  greenSoft: '#e6f5ec',
  red: '#b1192e',
  redSoft: '#fdecee',
  amber: '#9a6b00',
  amberSoft: '#fff5dd',
  ink: '#0a2540',
  inkSoft: '#475569',
  border: '#e2e8f0',
};

function VerdictBadge({ verified, result }) {
  let label = 'غير معروف';
  let bg = COLORS.amberSoft;
  let fg = COLORS.amber;
  let icon = '?';
  if (verified) {
    label = 'صحيحة وموثقة · Verified';
    bg = COLORS.greenSoft;
    fg = COLORS.green;
    icon = '✓';
  } else if (result === 'revoked') {
    label = 'مُلغاة · Revoked';
    bg = COLORS.redSoft;
    fg = COLORS.red;
    icon = '⊘';
  } else if (result === 'expired') {
    label = 'منتهية · Expired';
    bg = COLORS.amberSoft;
    fg = COLORS.amber;
    icon = '⌛';
  } else if (result === 'not_found' || result === 'invalid_hash') {
    label = 'غير موجودة · Not found';
    bg = COLORS.redSoft;
    fg = COLORS.red;
    icon = '✕';
  } else if (result === 'invalid') {
    label = 'غير صالحة (مسودة) · Invalid';
    bg = COLORS.redSoft;
    fg = COLORS.red;
    icon = '✕';
  }
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: '14px 20px',
        borderRadius: 12,
        fontSize: 18,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function CheckRow({ ok, label }) {
  if (ok === null || ok === undefined) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        fontSize: 14,
      }}
    >
      <span style={{ color: ok ? COLORS.green : COLORS.red, fontWeight: 700 }}>
        {ok ? '✓' : '✕'}
      </span>
      <span style={{ color: COLORS.inkSoft }}>{label}</span>
    </div>
  );
}

function fmt(d) {
  if (!d) return '—';
  try {
    return _fmtDate(d);
  } catch {
    return String(d).slice(0, 10);
  }
}

function shorten(s, head = 12, tail = 8) {
  if (!s) return '—';
  if (s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default function PublicVerifyPage() {
  const { hash: routeHash } = useParams();
  const navigate = useNavigate();
  const [hash, setHash] = useState(routeHash || '');
  const [certNumber, setCertNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!routeHash) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicVerificationService
      .verifyByHash(routeHash)
      .then(d => {
        if (!cancelled) setOut(d);
      })
      .catch(err => {
        if (!cancelled) {
          setOut(err?.response?.data || null);
          setError(err?.message || 'verification_failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeHash]);

  const submitHash = e => {
    e.preventDefault();
    const trimmed = hash.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) {
      setError('يجب إدخال هاش SHA-256 صالح (64 حرف hex)');
      return;
    }
    navigate(`/verify/${trimmed}`);
  };

  const submitNumber = async e => {
    e.preventDefault();
    const trimmed = certNumber.trim();
    if (!/^[A-Z0-9-]{4,40}$/i.test(trimmed)) {
      setError('رقم شهادة غير صالح');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await publicVerificationService.verifyByNumber(trimmed);
      setOut(res);
      if (res?.certificate?.transactionHash) {
        // success path: jump to the hash URL so the user can share it
        const certHash = res?.certificate?.hash;
        if (certHash) navigate(`/verify/${certHash}`);
      }
    } catch (err) {
      setOut(err?.response?.data || null);
      setError(err?.message || 'verification_failed');
    } finally {
      setLoading(false);
    }
  };

  const cert = out?.certificate;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#f7fafc',
        padding: '32px 16px',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,"Noto Sans Arabic",sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ color: COLORS.ink, fontSize: 28, margin: 0 }}>
            التحقق من شهادة · Certificate Verification
          </h1>
          <p style={{ color: COLORS.inkSoft, marginTop: 8 }}>
            تحقق من صحة الشهادة عبر هاشها أو رقمها
          </p>
        </header>

        {!routeHash && (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <form onSubmit={submitHash} style={{ marginBottom: 16 }}>
              <label
                style={{ display: 'block', fontSize: 13, color: COLORS.inkSoft, marginBottom: 6 }}
              >
                هاش الشهادة (SHA-256)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={hash}
                  onChange={e => setHash(e.target.value)}
                  placeholder="abc123…"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    fontSize: 14,
                    fontFamily: 'monospace',
                    direction: 'ltr',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: COLORS.ink,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  تحقق
                </button>
              </div>
            </form>

            <form onSubmit={submitNumber}>
              <label
                style={{ display: 'block', fontSize: 13, color: COLORS.inkSoft, marginBottom: 6 }}
              >
                أو رقم الشهادة
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={certNumber}
                  onChange={e => setCertNumber(e.target.value)}
                  placeholder="CERT-XXXXXX"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    fontSize: 14,
                    fontFamily: 'monospace',
                    direction: 'ltr',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#fff',
                    color: COLORS.ink,
                    border: `1px solid ${COLORS.ink}`,
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  بحث
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              color: COLORS.inkSoft,
            }}
          >
            جاري التحقق…
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              background: COLORS.redSoft,
              color: COLORS.red,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {out && !loading && (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <VerdictBadge verified={out.verified} result={out.result} />

            {cert && (
              <>
                <div style={{ marginTop: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: COLORS.inkSoft }}>الشهادة</div>
                  <div style={{ fontSize: 20, color: COLORS.ink, fontWeight: 600, marginTop: 4 }}>
                    {cert.title?.ar || cert.title?.en || '—'}
                  </div>
                  {cert.title?.en && cert.title?.ar !== cert.title?.en && (
                    <div style={{ fontSize: 14, color: COLORS.inkSoft, marginTop: 2 }}>
                      {cert.title.en}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <Field
                    label="المستلم · Recipient"
                    value={cert.recipient?.name?.ar || cert.recipient?.name?.en}
                  />
                  <Field label="رقم الشهادة" value={cert.certificateNumber} mono />
                  <Field label="تاريخ الإصدار" value={fmt(cert.issueDate)} />
                  <Field label="تاريخ الانتهاء" value={fmt(cert.expiryDate)} />
                  <Field label="الفئة · Category" value={cert.category} />
                  <Field label="عدد التواقيع" value={cert.signatures ?? 0} />
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.ink,
                      marginBottom: 8,
                    }}
                  >
                    سلامة البيانات · Integrity checks
                  </div>
                  <CheckRow
                    ok={out.hashMatch}
                    label="هاش الشهادة يطابق المحتوى · Cert hash matches payload"
                  />
                  <CheckRow ok={out.merkleMatch} label="إثبات Merkle صحيح · Merkle proof valid" />
                  <CheckRow
                    ok={out.blockchainMatch}
                    label="المرساة على السلسلة موجودة · Anchor exists on chain"
                  />
                </div>

                <div style={{ fontSize: 12, color: COLORS.inkSoft }}>
                  <Mono label="Hash" value={shorten(routeHash || cert.hash)} />
                  <Mono label="Merkle Root" value={shorten(cert.merkleRoot)} />
                  <Mono label="Tx" value={shorten(cert.transactionHash)} />
                  <Mono label="Block" value={cert.blockNumber ?? '—'} />
                  <Mono label="Network" value={cert.network || '—'} />
                </div>
              </>
            )}
          </div>
        )}

        <footer
          style={{
            marginTop: 32,
            textAlign: 'center',
            fontSize: 12,
            color: COLORS.inkSoft,
          }}
        >
          مراكز الأوائل للرعاية النهارية · Al-Awael Day Care Centers
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          color: COLORS.ink,
          marginTop: 2,
          fontFamily: mono ? 'monospace' : undefined,
          direction: mono ? 'ltr' : undefined,
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function Mono({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', direction: 'ltr' }}>{value}</span>
    </div>
  );
}
