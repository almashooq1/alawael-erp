/**
 * NationalAddressField — Saudi National Address (وَصِل / SPL) capture widget.
 *
 * Drop-in field for legacy frontend forms. Mirrors the Next.js
 * counterpart at `alawael-rehab-platform/apps/web-admin/src/components/ui/national-address-field.tsx`.
 *
 *   <NationalAddressField
 *     value={form.nationalAddress}
 *     onChange={(addr) => setForm({ ...form, nationalAddress: addr })}
 *     nationalId={form.nationalId}
 *     required
 *   />
 *
 * The widget hits POST /api/v1/wasel/address/verify-and-stamp and
 * returns the canonical subdocument shape the mongoose backend
 * expects. The parent form should refuse to submit when the address
 * is present but `verification.verified !== true`.
 */

import React, { useState } from 'react';
import apiClient from '../api/apiClient';

const SHORT_CODE_REGEX = /^[A-Z]{4}\d{4}$/;

const fieldsetStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1rem',
};

const legendStyle = {
  padding: '0 0.5rem',
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#374151',
};

const rowStyle = { display: 'flex', gap: '0.5rem', alignItems: 'flex-end' };
const inputStyle = {
  flex: 1,
  padding: '0.5rem',
  borderRadius: '0.375rem',
  border: '1px solid #d1d5db',
  fontSize: '0.9375rem',
};
const buttonStyle = {
  padding: '0.5rem 1rem',
  background: '#2563eb',
  color: '#fff',
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};
const secondaryButtonStyle = {
  ...buttonStyle,
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
};
const badgeStyle = variant => ({
  display: 'inline-block',
  padding: '0.125rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 500,
  background: variant === 'success' ? '#d1fae5' : variant === 'danger' ? '#fee2e2' : '#fef3c7',
  color: variant === 'success' ? '#065f46' : variant === 'danger' ? '#991b1b' : '#92400e',
});

export default function NationalAddressField({
  value,
  onChange,
  nationalId,
  required = false,
  disabled = false,
  label = 'العنوان الوطني السعودي',
}) {
  const [shortCode, setShortCode] = useState((value && value.shortCode) || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const verified = !!(value && value.verification && value.verification.verified === true);
  const status = value && value.verification && value.verification.status;

  async function handleVerify() {
    setError(null);
    const trimmed = String(shortCode).trim().toUpperCase();
    if (!SHORT_CODE_REGEX.test(trimmed)) {
      setError('تنسيق غير صالح — يجب أن يكون 4 حروف ثم 4 أرقام (مثل RFYA1234)');
      return;
    }
    setBusy(true);
    try {
      const body = { shortCode: trimmed };
      if (nationalId) body.nationalId = nationalId;
      const res = await apiClient.post('/api/v1/wasel/address/verify-and-stamp', body);
      const data = res.data || res;
      onChange(data.address);
      if (!data.verified) {
        const v = data.address && data.address.verification;
        const reason =
          (v && v.message) ||
          (v && v.status === 'not_found'
            ? 'الرمز غير مسجَّل في العنوان الوطني'
            : 'لم يتم التحقق من الرمز');
        setError(reason);
      }
    } catch (e) {
      setError(
        (e && e.response && e.response.data && e.response.data.message) ||
          e.message ||
          'تعذّر الاتصال بخدمة وَصِل'
      );
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    setShortCode('');
    setError(null);
    onChange(undefined);
  }

  function handleShortCodeChange(v) {
    setShortCode(v);
    if (verified && v.toUpperCase() !== ((value && value.shortCode) || '').toUpperCase()) {
      onChange({
        ...(value || {}),
        shortCode: v.toUpperCase(),
        verification: { verified: false, status: 'unverified' },
      });
    }
  }

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>
        {label}
        {required && <span style={{ color: '#ef4444', marginInlineStart: 4 }}>*</span>}
      </legend>

      <div style={rowStyle}>
        <input
          type="text"
          value={shortCode}
          onChange={e => handleShortCodeChange(e.target.value)}
          placeholder="مثال: RFYA1234"
          maxLength={8}
          disabled={disabled || busy}
          style={inputStyle}
          dir="ltr"
          aria-label="الرمز البريدي (Short Code)"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={disabled || busy || !shortCode}
          style={buttonStyle}
        >
          {busy ? 'جاري التحقق…' : 'تحقّق'}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || busy}
            style={secondaryButtonStyle}
          >
            مسح
          </button>
        )}
      </div>

      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {verified ? (
          <span style={badgeStyle('success')}>موثَّق عبر وَصِل ✓</span>
        ) : status && status !== 'unverified' ? (
          <span style={badgeStyle('danger')}>
            {status === 'not_found' && 'غير مسجَّل'}
            {status === 'invalid_format' && 'تنسيق غير صالح'}
            {status === 'unknown' && 'تعذَّر التحقق'}
          </span>
        ) : shortCode ? (
          <span style={badgeStyle('warning')}>بانتظار التحقق</span>
        ) : null}
        {value && value.verification && value.verification.mode && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>[{value.verification.mode}]</span>
        )}
      </div>

      {error && (
        <div role="alert" style={{ marginTop: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {verified && (
        <div
          style={{
            marginTop: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          {value.city && (
            <div>
              <strong>المدينة:</strong> {value.city}
            </div>
          )}
          {value.district && (
            <div>
              <strong>الحي:</strong> {value.district}
            </div>
          )}
          {value.postalCode && (
            <div>
              <strong>الرمز البريدي:</strong> {value.postalCode}
            </div>
          )}
          {value.buildingNumber && (
            <div>
              <strong>رقم المبنى:</strong> {value.buildingNumber}
            </div>
          )}
          {value.additionalNumber && (
            <div>
              <strong>الرقم الإضافي:</strong> {value.additionalNumber}
            </div>
          )}
          {value.fullAddress && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>العنوان:</strong> {value.fullAddress}
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
