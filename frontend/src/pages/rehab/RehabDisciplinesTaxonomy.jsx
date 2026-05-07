/**
 * RehabDisciplinesTaxonomy.jsx
 *
 * Read-only admin / clinical-coordinator view of the canonical
 * rehabilitation-disciplines registry exposed by
 * GET /api/v1/rehab/disciplines (Phase 9 C5).
 *
 * Clinical goal: give coordinators a single searchable reference for
 * every discipline's ownership, cadence, supported age bands, and
 * linked programs/measures/goals — without opening the backend config.
 *
 * Route: /rehab/disciplines
 * Roles: admin, super_admin, clinical_coordinator, therapist, manager
 */

import React, { useCallback, useEffect, useState } from 'react';
import rehabDisciplinesService from '../../services/rehabDisciplines.service';

// ─── tiny helpers ────────────────────────────────────────────────────────────

const DOMAIN_LABELS = {
  physical: 'Physical',
  occupational: 'Occupational',
  speech: 'Speech & Language',
  behavioral: 'Behavioral',
  educational: 'Educational',
  psychological: 'Psychological',
  social: 'Social',
  vocational: 'Vocational',
};

const DOMAIN_COLORS = {
  physical: '#2563eb',
  occupational: '#7c3aed',
  speech: '#0891b2',
  behavioral: '#dc2626',
  educational: '#16a34a',
  psychological: '#d97706',
  social: '#db2777',
  vocational: '#64748b',
};

function Badge({ text, color = '#64748b' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        background: color,
        marginRight: 4,
        marginBottom: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '16px 20px',
        minWidth: 120,
        flex: '1 1 120px',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RehabDisciplinesTaxonomy() {
  const [disciplines, setDisciplines] = useState([]);
  const [taxonomy, setTaxonomy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, taxRes] = await Promise.all([
        rehabDisciplinesService.list(),
        rehabDisciplinesService.getTaxonomy(),
      ]);
      setDisciplines(listRes?.data?.data ?? listRes?.data ?? []);
      setTaxonomy(taxRes?.data?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? err.message ?? 'تعذّر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = disciplines.filter(d => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      d.nameAr?.includes(q) ||
      d.nameEn?.toLowerCase().includes(q) ||
      d.code?.toLowerCase().includes(q);
    const matchD = !filterDomain || d.domain === filterDomain;
    return matchQ && matchD;
  });

  const domainGroups = [...new Set(disciplines.map(d => d.domain))];

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        جاري تحميل سجل التخصصات…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <p>{error}</p>
        <button
          onClick={load}
          style={{
            marginTop: 12,
            padding: '8px 20px',
            borderRadius: 6,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          سجل التخصصات التأهيلية
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          مرجع قراءة فقط — يعكس السجل الأساسي للمنصة (Phase 9)
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="إجمالي التخصصات" value={disciplines.length} />
        <KpiCard label="المجالات" value={domainGroups.length} />
        {taxonomy && (
          <>
            <KpiCard label="أنماط التسليم" value={taxonomy.deliveryModes?.length ?? '—'} />
            <KpiCard label="الفئات العمرية" value={taxonomy.ageBands?.length ?? '—'} />
          </>
        )}
      </div>

      {/* filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="بحث بالاسم أو الكود…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            minWidth: 220,
            background: '#fff',
          }}
        />
        <select
          value={filterDomain}
          onChange={e => setFilterDomain(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: 13,
            background: '#fff',
          }}
        >
          <option value="">كل المجالات</option>
          {domainGroups.map(d => (
            <option key={d} value={d}>
              {DOMAIN_LABELS[d] ?? d}
            </option>
          ))}
        </select>
        {(search || filterDomain) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterDomain('');
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            مسح الفلتر
          </button>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>
          {filtered.length} تخصص
        </span>
      </div>

      {/* taxonomy chips */}
      {taxonomy && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
            أنماط التسليم المتاحة
          </div>
          <div>
            {(taxonomy.deliveryModes ?? []).map(m => (
              <Badge key={m} text={m} color="#0891b2" />
            ))}
          </div>
        </div>
      )}

      {/* discipline cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            لا توجد تخصصات تطابق المعايير
          </div>
        )}
        {filtered.map(d => {
          const isOpen = expanded === d.id;
          return (
            <div
              key={d.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: DOMAIN_COLORS[d.domain] ?? '#64748b',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                    {d.nameAr ?? d.nameEn}
                  </span>
                  {d.nameAr && d.nameEn && (
                    <span style={{ color: '#64748b', fontSize: 12, marginRight: 8 }}>
                      {d.nameEn}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge
                    text={DOMAIN_LABELS[d.domain] ?? d.domain}
                    color={DOMAIN_COLORS[d.domain] ?? '#64748b'}
                  />
                  <Badge text={d.code} color="#475569" />
                </div>
                <span style={{ color: '#94a3b8', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* expanded detail */}
              {isOpen && (
                <div
                  style={{
                    padding: '0 18px 16px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                      gap: 12,
                      marginTop: 14,
                      marginBottom: 14,
                    }}
                  >
                    <InfoItem label="الدور المالك" value={d.ownerRole} />
                    <InfoItem label="الدور الرئيسي" value={d.leadSpecialistRole} />
                    <InfoItem label="دورة المراجعة" value={`${d.defaultReviewCycleDays} يوم`} />
                    <InfoItem label="دورة التقييم" value={`${d.assessmentCadenceDays} يوم`} />
                    <InfoItem label="البرامج" value={d.programCount} />
                    <InfoItem label="التدخلات" value={d.interventionCount} />
                    <InfoItem label="المقاييس" value={d.measureCount} />
                    <InfoItem label="قوالب الأهداف" value={d.goalTemplateCount} />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>الفئات العمرية: </span>
                    {(d.supportedAgeBands ?? []).map(b => (
                      <Badge key={b} text={b} color="#7c3aed" />
                    ))}
                  </div>

                  <div>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>أنماط التسليم: </span>
                    {(d.deliveryModes ?? []).map(m => (
                      <Badge key={m} text={m} color="#0891b2" />
                    ))}
                  </div>

                  {d.compliance?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>الامتثال: </span>
                      {d.compliance.map(c => (
                        <Badge key={c} text={c} color="#16a34a" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{value}</div>
    </div>
  );
}
