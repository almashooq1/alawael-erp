/**
 * RehabGoalSuggestions.jsx
 *
 * Interactive SMART-goal & intervention suggestion tool powered by
 * GET /api/v1/rehab/goal-suggestions/* (Phase 9 C8).
 *
 * Clinical goal: let therapists quickly discover evidence-based goals
 * and interventions for a beneficiary by selecting discipline(s) and
 * entering the beneficiary's age — replaces manual lookup in paper
 * catalogues and reduces care-plan authoring time.
 *
 * Route: /rehab/goal-suggestions
 * Roles: admin, super_admin, therapist, clinical_coordinator, manager
 */

import React, { useCallback, useEffect, useState } from 'react';
import rehabDisciplinesService from '../../services/rehabDisciplines.service';
import rehabGoalSuggestionsService from '../../services/rehabGoalSuggestions.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };

function Badge({ text, color = '#64748b', small }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: small ? '1px 6px' : '2px 8px',
        borderRadius: 9999,
        fontSize: small ? 10 : 11,
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

function GoalCard({ goal, onExclude, excluded }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: excluded ? '#f8fafc' : '#fff',
        border: `1px solid ${excluded ? '#e2e8f0' : '#cbd5e1'}`,
        borderRadius: 8,
        marginBottom: 8,
        opacity: excluded ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
            {goal.nameAr ?? goal.nameEn ?? goal.code}
          </span>
          {goal.nameAr && goal.nameEn && (
            <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 8 }}>{goal.nameEn}</span>
          )}
        </div>
        {goal.priority && (
          <Badge text={goal.priority} color={PRIORITY_COLOR[goal.priority] ?? '#64748b'} small />
        )}
        {goal.code && <Badge text={goal.code} color="#475569" small />}
        {goal.score != null && (
          <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
            score: {goal.score}
          </span>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            onExclude(goal.code ?? goal.id);
          }}
          title={excluded ? 'استثناء مُفعَّل' : 'استثناء هذا الهدف'}
          style={{
            background: excluded ? '#e2e8f0' : '#fee2e2',
            border: 'none',
            borderRadius: 4,
            color: excluded ? '#94a3b8' : '#dc2626',
            cursor: 'pointer',
            fontSize: 11,
            padding: '2px 7px',
          }}
        >
          {excluded ? 'مستثنى' : 'استثناء'}
        </button>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #f1f5f9' }}>
          {goal.description && (
            <p style={{ fontSize: 12, color: '#475569', margin: '8px 0 6px' }}>
              {goal.description}
            </p>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
              gap: 8,
              marginTop: 8,
            }}
          >
            {goal.domain && <InfoItem label="المجال" value={goal.domain} />}
            {goal.targetAgeMin != null && (
              <InfoItem
                label="الفئة العمرية"
                value={`${goal.targetAgeMin}–${goal.targetAgeMax ?? '∞'} شهر`}
              />
            )}
            {goal.measurementUnit && <InfoItem label="وحدة القياس" value={goal.measurementUnit} />}
            {goal.baselineRequired != null && (
              <InfoItem label="يتطلب خط أساس" value={goal.baselineRequired ? 'نعم' : 'لا'} />
            )}
          </div>
          {goal.interventions?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                التدخلات المقترحة
              </div>
              {goal.interventions.map((iv, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: 12,
                    color: '#475569',
                    padding: '3px 0',
                    borderBottom: '1px dashed #f1f5f9',
                  }}
                >
                  • {typeof iv === 'string' ? iv : (iv.nameAr ?? iv.nameEn ?? iv.code)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>{value}</div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RehabGoalSuggestions() {
  const [disciplines, setDisciplines] = useState([]);
  const [loadingDisc, setLoadingDisc] = useState(true);

  // query params
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [ageMonths, setAgeMonths] = useState('');
  const [limit, setLimit] = useState(10);
  const [excludedCodes, setExcludedCodes] = useState([]);

  // results
  const [goals, setGoals] = useState(null);
  const [interventions, setInterventions] = useState(null);
  const [draft, setDraft] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('goals');

  // load disciplines for the multi-select
  useEffect(() => {
    setLoadingDisc(true);
    rehabDisciplinesService
      .list()
      .then(res => setDisciplines(res?.data?.data ?? res?.data ?? []))
      .catch(() => setDisciplines([]))
      .finally(() => setLoadingDisc(false));
  }, []);

  const toggleDiscipline = id => {
    setSelectedDisciplines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSearch = useCallback(async () => {
    if (selectedDisciplines.length === 0) {
      setError('اختر تخصصاً واحداً على الأقل');
      return;
    }
    setError(null);
    setSearching(true);
    setGoals(null);
    setInterventions(null);
    setDraft(null);
    try {
      const params = {
        discipline_ids: selectedDisciplines.join(','),
        limit,
        ...(ageMonths !== '' && { age_months: ageMonths }),
        ...(excludedCodes.length > 0 && { exclude: excludedCodes.join(',') }),
      };
      const [goalsRes, ivRes, draftRes] = await Promise.all([
        rehabGoalSuggestionsService.listGoals(params),
        rehabGoalSuggestionsService.listInterventions(params),
        rehabGoalSuggestionsService.draft(params),
      ]);
      setGoals(goalsRes?.data?.data ?? goalsRes?.data ?? []);
      setInterventions(ivRes?.data?.data ?? ivRes?.data ?? []);
      setDraft(draftRes?.data?.data ?? draftRes?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? err.message ?? 'تعذّر تحميل المقترحات');
    } finally {
      setSearching(false);
    }
  }, [selectedDisciplines, ageMonths, limit, excludedCodes]);

  const handleExclude = code => {
    setExcludedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleClearExclusions = () => setExcludedCodes([]);

  return (
    <div style={{ padding: '24px 32px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          اقتراحات الأهداف التأهيلية الذكية
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          محرك توصيات SMART مدعوم بالذكاء الاصطناعي — Phase 9 C8
        </p>
      </div>

      {/* query panel */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1e293b',
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          معايير البحث
        </h2>

        {/* discipline picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
            التخصصات <span style={{ color: '#dc2626' }}>*</span>
          </label>
          {loadingDisc ? (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>جاري التحميل…</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {disciplines.map(d => {
                const sel = selectedDisciplines.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDiscipline(d.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: `1.5px solid ${sel ? '#2563eb' : '#cbd5e1'}`,
                      background: sel ? '#2563eb' : '#fff',
                      color: sel ? '#fff' : '#475569',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: sel ? 600 : 400,
                    }}
                  >
                    {d.nameAr ?? d.nameEn}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* age + limit */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
              العمر (بالشهور)
            </label>
            <input
              type="number"
              min={0}
              value={ageMonths}
              onChange={e => setAgeMonths(e.target.value)}
              placeholder="اختياري"
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                width: 130,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
              عدد النتائج
            </label>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
              }}
            >
              {[5, 10, 20, 50].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* excluded codes */}
        {excludedCodes.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>أهداف مستثناة: </span>
            {excludedCodes.map(c => (
              <Badge key={c} text={c} color="#dc2626" small />
            ))}
            <button
              onClick={handleClearExclusions}
              style={{
                fontSize: 11,
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              مسح الكل
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 13,
              color: '#dc2626',
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={searching || selectedDisciplines.length === 0}
          style={{
            padding: '9px 28px',
            borderRadius: 6,
            border: 'none',
            background: searching || selectedDisciplines.length === 0 ? '#94a3b8' : '#2563eb',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: searching || selectedDisciplines.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {searching ? 'جارٍ البحث…' : 'عرض المقترحات'}
        </button>
      </div>

      {/* results */}
      {(goals || interventions || draft) && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 20px',
            }}
          >
            {[
              { id: 'goals', label: `الأهداف (${goals?.length ?? 0})` },
              { id: 'interventions', label: `التدخلات (${interventions?.length ?? 0})` },
              { id: 'draft', label: 'مسودة الخطة' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  color: activeTab === tab.id ? '#2563eb' : '#64748b',
                  borderBottom:
                    activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* goals tab */}
            {activeTab === 'goals' && (
              <>
                {goals?.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 32 }}>
                    لا توجد أهداف مقترحة لهذه المعايير
                  </div>
                )}
                {(goals ?? []).map((g, i) => (
                  <GoalCard
                    key={g.id ?? g.code ?? i}
                    goal={g}
                    excluded={excludedCodes.includes(g.code ?? g.id)}
                    onExclude={handleExclude}
                  />
                ))}
              </>
            )}

            {/* interventions tab */}
            {activeTab === 'interventions' && (
              <>
                {interventions?.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 32 }}>
                    لا توجد تدخلات مقترحة لهذه المعايير
                  </div>
                )}
                {(interventions ?? []).map((iv, i) => (
                  <div
                    key={iv.id ?? iv.code ?? i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 7,
                      padding: '12px 14px',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4 }}
                    >
                      {iv.nameAr ?? iv.nameEn ?? iv.code}
                    </div>
                    {iv.description && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>{iv.description}</div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      {iv.domain && <Badge text={iv.domain} color="#7c3aed" small />}
                      {iv.deliveryMode && <Badge text={iv.deliveryMode} color="#0891b2" small />}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* draft tab */}
            {activeTab === 'draft' && (
              <div>
                {!draft ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 32 }}>
                    لا توجد مسودة متاحة
                  </div>
                ) : (
                  <pre
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 16,
                      fontSize: 12,
                      overflowX: 'auto',
                      color: '#1e293b',
                    }}
                  >
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
