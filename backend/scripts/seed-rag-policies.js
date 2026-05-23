#!/usr/bin/env node
/**
 * seed-rag-policies.js — ingest starter policy documents into the RAG knowledge base (W283d).
 *
 * Wires the W283 RAG pipeline into a CLI tool. The 12 starter policies
 * below cover the highest-volume Parent Chatbot policy questions
 * (cancellation, payment, attendance, documents, transport, etc.) so
 * POLICY_QUERY actually returns useful Arabic answers in dev/demo
 * instead of silently downgrading to UNKNOWN.
 *
 * Idempotent — uses `replacePreviousVersion: true` per sourceDocId,
 * so re-running the script bumps the version (deactivates old chunks,
 * inserts new). Safe to re-run after editing the policies array.
 *
 * Usage:
 *   node scripts/seed-rag-policies.js                seed all org-wide
 *   node scripts/seed-rag-policies.js --branch ID    seed only for a branch
 *   node scripts/seed-rag-policies.js --dry-run      preview, no DB write
 *   node scripts/seed-rag-policies.js --list         list policies + exit
 *   node scripts/seed-rag-policies.js --json         machine-readable output
 *
 * Env:
 *   MONGODB_URI         mongo connection (required unless --dry-run / --list)
 *   EMBEDDING_PROVIDER  defaults to 'mock' (deterministic for dev/CI)
 *
 * ⚠️  IMPORTANT — Embedding-provider quality (verified 2026-05-23 in-memory run):
 *
 *   The MOCK provider is deterministic but NOT semantic. Same text → same
 *   vector (good for testing the pipeline) — but DIFFERENT texts get
 *   essentially random cosine similarity (0.06-0.12 in practice, well
 *   below the 0.6 default POLICY_QUERY threshold). End-to-end test:
 *
 *     Q: "طرق الدفع المتاحة"  →  picks "سياسة إلغاء وتعديل الموعد" (WRONG)
 *
 *   With mock provider, POLICY_QUERY downgrades to UNKNOWN for ~all
 *   queries because no chunks pass the 0.6 threshold. The CHATBOT WIRING
 *   is correct — RAG-driven answers fire only when retrieval succeeds.
 *
 *   For production / demo / any actual Q&A: set
 *     EMBEDDING_PROVIDER=cohere-embed-multilingual-v3 (best for Arabic, 1024-dim)
 *     OR EMBEDDING_PROVIDER=openai-text-embedding-3-large (good, 3072-dim)
 *   + the corresponding API key in env (COHERE_API_KEY / OPENAI_API_KEY)
 *   + re-run this seed against the production Mongo.
 */

'use strict';

const args = process.argv.slice(2);
function arg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function flag(name) {
  return args.includes(name);
}

const HELP = flag('--help') || flag('-h');
const DRY_RUN = flag('--dry-run');
const LIST = flag('--list');
const JSON_OUT = flag('--json');
const BRANCH_ID = arg('--branch') || null;

if (HELP) {
  console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(0, 25).join('\n'));
  process.exit(0);
}

// ─── Starter policies ─────────────────────────────────────────────────
// Each policy is one logical document. Long ones get chunked automatically
// by ragService.chunkText (default 800 chars).
const POLICIES = [
  {
    sourceDocId: 'policy-cancellation-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'سياسة إلغاء وتعديل الموعد',
    sectionPath: 'العمليات > المواعيد',
    text: `سياسة إلغاء وتعديل المواعيد في مركز الأوائل لتأهيل ذوي الإعاقة.

الإلغاء قبل 24 ساعة من الموعد: مجاني، بدون أي رسوم. يحق للأسرة إلغاء أو تعديل الموعد عبر الاتصال بالاستقبال أو من خلال بوابة الأسرة الإلكترونية.

الإلغاء خلال أقل من 24 ساعة: تُطبَّق رسوم تأخير قدرها 50% من قيمة الجلسة المحجوزة. تُحسم تلقائياً من الفاتورة التالية للمستفيد.

عدم الحضور بدون إخطار (No-Show): يُحتسب كجلسة مكتملة بالقيمة الكاملة. يُسجَّل في ملف المستفيد، وتزداد عند تكرارها (3 مرات في 90 يوماً) إلى مراجعة من المنسق السريري لإعادة تقييم جدول الجلسات.

الإلغاء بسبب طارئ طبي موثق (تقرير طبي رسمي): يُعفى من جميع الرسوم. يُقدَّم التقرير خلال 7 أيام عمل من تاريخ الموعد الملغى.

إلغاء جلسة بسبب المعالج (مرض، طارئ، تدريب): يُعاد جدولة الجلسة في أقرب وقت ممكن دون أي رسوم. تُقدَّم الأسرة 3 خيارات للموعد البديل خلال 48 ساعة.`,
  },
  {
    sourceDocId: 'policy-payment-methods-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'سياسة طرق الدفع والفوترة',
    sectionPath: 'المالية > الفواتير',
    text: `طرق الدفع المقبولة في مركز الأوائل:

1. التحويل البنكي إلى الحساب الرسمي للمركز (يستغرق 1-3 أيام عمل للتأكيد).
2. مدى — عبر بوابة الدفع الإلكتروني في بوابة الأسرة.
3. بطاقات ائتمان (Visa, MasterCard, Mada) — عبر بوابة HyperPay الآمنة.
4. Apple Pay — متاح عبر بوابة الدفع الإلكتروني.
5. STC Pay — مدفوعات لحظية بدون رسوم.
6. الدفع النقدي في الاستقبال — فقط للمبالغ أقل من 1000 ريال سعودي.

دورة الفوترة: تُصدَر الفواتير في اليوم الأول من كل شهر، تستحق الدفع خلال 14 يوماً. التأخر عن الدفع 30 يوماً يؤدي إلى تعليق مؤقت للجلسات حتى التسوية.

الفواتير المعتمدة من التأمين: يتم تقديمها مباشرة لشركة التأمين عبر منصة نفيس (NPHIES). تظهر للأسرة فقط نسبة المشاركة (Co-payment) المطلوبة.

استرداد الدفعات الزائدة: تُعالَج خلال 7 أيام عمل عبر نفس قناة الدفع الأصلية.`,
  },
  {
    sourceDocId: 'policy-document-request-sla-v1',
    sourceDocType: 'sop',
    sourceDocTitle: 'إجراءات طلب التقارير والشهادات',
    sectionPath: 'الخدمات الإدارية > الوثائق',
    text: `إجراءات طلب التقارير والشهادات الرسمية من مركز الأوائل.

أنواع التقارير المتاحة:
- التقرير الطبي الشامل (تشخيص + خطة علاج + توصيات): مدة الإصدار 5-7 أيام عمل. الرسم: 200 ريال.
- شهادة التحاق بالخدمات: مدة الإصدار 2-3 أيام عمل. مجانية.
- تقرير التقدم الدوري (ربع سنوي): مدة الإصدار 3-5 أيام عمل. مجاني للأسر النشطة.
- التقرير الإحصائي للجلسات (للتأمين أو المرجع): مدة الإصدار 1-2 أيام عمل. مجاني.
- شهادة المعالج المخوَّل: للأغراض الرسمية (محاكم، تأمين، شركات). مدة الإصدار 3 أيام عمل. الرسم: 100 ريال.

كيفية الطلب:
1. عبر بوابة الأسرة الإلكترونية — قسم "طلب وثيقة".
2. عبر الاتصال بالاستقبال على الرقم الرسمي للمركز.
3. حضور شخصي للاستقبال مع إثبات الهوية وولاية المستفيد القاصر.

طريقة الاستلام: نسخة رقمية موقعة إلكترونياً (PDF) عبر البريد المسجل في الملف، أو نسخة ورقية للاستلام من الاستقبال (لا تُرسَل بالبريد).

كل تقرير يحمل توقيع المعالج المسؤول + ختم المركز + رقم تسلسلي قابل للتحقق عبر بوابة المركز.`,
  },
  {
    sourceDocId: 'policy-transport-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'سياسة خدمة النقل والتوصيل',
    sectionPath: 'الخدمات اللوجستية > النقل',
    text: `خدمة النقل والتوصيل لمراكز الأوائل.

التغطية الجغرافية: تختلف بين الفروع. الفرع الرئيسي (الرياض) يغطي ضمن نطاق 25 كم. للفروع الأخرى، يرجى الاتصال بالاستقبال للاستفسار عن مسارك.

أنواع الخدمة:
- التوصيل اليومي ضمن مسار محدد مسبقاً (Routes ثابتة).
- التوصيل عند الطلب لحالات استثنائية (إضافي، يخضع للتوفر).

شروط الاشتراك:
1. السن أقل من 18 سنة.
2. الإقامة ضمن النطاق الجغرافي المغطى.
3. ولي أمر يستلم/يسلِّم المستفيد في نقطة التجمع المحددة.
4. توقيع عقد خدمة النقل سنوياً.

الأمان: جميع الباصات مزودة بكاميرات داخلية + GPS + مشرف بالغ. يحق للأسرة تتبع موقع الباص لحظياً عبر تطبيق المركز.

الرسوم: 600 ريال شهرياً للتوصيل اليومي ذهاب وإياب. الخدمة عند الطلب: 50 ريال للرحلة الواحدة.

إجازات: لا تُحتسب رسوم النقل خلال إجازات المركز الرسمية (إجازات وطنية، إجازات الأعياد).

الإلغاء: إخطار قبل 30 يوماً من نهاية الشهر. لا تُسترَد رسوم الشهر الجاري.`,
  },
  {
    sourceDocId: 'policy-attendance-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'سياسة الحضور والمواظبة',
    sectionPath: 'العمليات > الحضور',
    text: `سياسة الحضور والمواظبة للمستفيدين.

تكرار الجلسات: يُحدَّد عدد الجلسات الأسبوعية بناءً على التقييم الأولي للمعالج وخطة الرعاية المعتمدة من الفريق متعدد التخصصات.

الحد الأدنى للالتزام: 80% من الجلسات المجدولة شهرياً. النزول عن هذه النسبة يُؤدي إلى تنبيه ودي للأسرة + مراجعة من المنسق السريري.

تعديل التكرار: يحق للأسرة طلب تخفيض/زيادة عدد الجلسات الأسبوعية بعد مراجعة سريرية. تطلب الأسرة عبر بوابة الأسرة أو الاستقبال.

الجلسات المتأخرة: المستفيد الذي يصل بعد 10 دقائق من بداية الجلسة يحضر الوقت المتبقي فقط، دون تمديد. التأخير المتكرر (3 مرات في 30 يوماً) يستدعي مراجعة من المنسق.

التوقف المؤقت: يحق للأسرة إيقاف الجلسات مؤقتاً (Hold) لمدة أقصاها 30 يوماً سنوياً دون فقدان المكان. ما زاد عن 30 يوماً يُعتبر إلغاءً ويُعاد دخول قائمة الانتظار.

الانقطاع: إذا انقطع المستفيد 45 يوماً متواصلة دون إخطار، يُغلَق الملف تلقائياً ويحق للمركز إعادة المكان لشخص آخر من قائمة الانتظار.`,
  },
  {
    sourceDocId: 'policy-confidentiality-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'سياسة السرية وحماية البيانات الشخصية',
    sectionPath: 'الحوكمة > الخصوصية',
    text: `سياسة السرية وحماية البيانات الشخصية (متوافقة مع نظام حماية البيانات الشخصية السعودي PDPL).

المبادئ الأساسية:
1. كل بيانات المستفيد ومعلوماته الطبية سرية بالكامل، لا يتم مشاركتها مع أي طرف ثالث دون موافقة صريحة من ولي الأمر.
2. الموافقات تُمنح عبر سجل الموافقات الرسمي (Consent Record) وتشمل: العلاج، تبادل البيانات، التصوير، الرحلات، البحث العلمي.
3. حق الأسرة في طلب نسخة كاملة من بيانات المستفيد (Data Subject Access Request) — يتم خلال 30 يوماً كحد أقصى.
4. حق الأسرة في طلب تصحيح أو حذف بيانات خاطئة — يتم خلال 30 يوماً.
5. الاحتفاظ بالسجلات: ≥10 سنوات للبالغين، ≥25 سنة للقاصرين (لأغراض المتابعة الطبية القانونية).
6. تشفير جميع البيانات الحساسة في النقل (TLS 1.3+) والتخزين (AES-256).

تبادل البيانات مع جهات حكومية: مسموح فقط بناءً على طلب رسمي موثق من جهة معتمدة (وزارة الصحة، هيئة رعاية الأشخاص ذوي الإعاقة، النيابة العامة) ومع إخطار الأسرة كتابياً قبل التبادل.

موظف حماية البيانات (DPO): يمكن التواصل معه مباشرة عبر البريد الإلكتروني المخصص dpo@alawael.sa للاستفسار عن أي جانب من جوانب حماية البيانات.`,
  },
  {
    sourceDocId: 'policy-clinic-hours-v1',
    sourceDocType: 'internal_policy',
    sourceDocTitle: 'ساعات العمل والإجازات الرسمية',
    sectionPath: 'العمليات > الجدولة',
    text: `ساعات العمل الرسمية لمركز الأوائل.

أيام العمل: الأحد إلى الخميس.
ساعات العمل: من الساعة 7:30 صباحاً حتى الساعة 5:00 مساءً.
استراحة الإدارة: من 12:30 ظهراً حتى 1:00 ظهراً (الجلسات تستمر).

الجمعة والسبت: المركز مغلق. خدمة الاستقبال الطارئة فقط عبر رقم الطوارئ المسجل لكل أسرة.

الإجازات الرسمية: المركز يلتزم بتقويم الإجازات الرسمية في المملكة العربية السعودية:
- إجازة عيد الفطر المبارك (3 أيام).
- إجازة عيد الأضحى المبارك (4 أيام).
- اليوم الوطني السعودي (23 سبتمبر).
- يوم التأسيس السعودي (22 فبراير).
- إجازات أخرى يُعلنها مجلس الوزراء.

تُعلَن جدول الإجازات السنوية في ديسمبر من كل عام عبر بوابة الأسرة + رسالة نصية للأسر المسجلة.

الجلسات التي تتعارض مع إجازة رسمية: يُعاد جدولتها تلقائياً في الأسبوع التالي، وتُخطَر الأسرة بالموعد البديل قبل 3 أيام عمل على الأقل.

أوقات الذروة: من 2:00 مساءً حتى 5:00 مساءً (بعد الدوام المدرسي). يُنصَح بحجز المواعيد الصباحية للمستفيدين الذين لا يلتحقون بمدرسة عامة.`,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  if (LIST) {
    if (JSON_OUT) {
      console.log(
        JSON.stringify(
          POLICIES.map(p => ({
            sourceDocId: p.sourceDocId,
            sourceDocType: p.sourceDocType,
            sourceDocTitle: p.sourceDocTitle,
            sectionPath: p.sectionPath,
            approxLength: p.text.length,
          })),
          null,
          2
        )
      );
    } else {
      console.log(`Starter RAG policies (${POLICIES.length} total):\n`);
      for (const p of POLICIES) {
        console.log(`  - ${p.sourceDocId} → ${p.sourceDocTitle} (~${p.text.length} chars)`);
      }
    }
    return;
  }

  if (DRY_RUN) {
    const provider = require('../services/ai/embeddingProvider');
    const ragServiceFactory = require('../services/ai/rag.service');
    const FakeChunk = {
      insertMany: async docs => docs.map((d, i) => ({ _id: `dry-${i}`, ...d })),
      updateMany: async () => ({ matchedCount: 0 }),
    };
    const svc = ragServiceFactory({ embeddingProvider: provider, ChunkModel: FakeChunk });
    const results = [];
    for (const policy of POLICIES) {
      const r = await svc.ingestDocument(
        {
          ...policy,
          languageHint: 'ar',
          branchId: BRANCH_ID,
          isOrgWide: !BRANCH_ID,
        },
        { replacePreviousVersion: true }
      );
      results.push({ sourceDocId: r.sourceDocId, chunkCount: r.chunkCount });
    }
    if (JSON_OUT) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            policies: results,
            total: results.length,
            totalChunks: results.reduce((s, r) => s + r.chunkCount, 0),
          },
          null,
          2
        )
      );
    } else {
      console.log(
        `[dry-run] Would ingest ${results.length} policies → ${results.reduce((s, r) => s + r.chunkCount, 0)} total chunks`
      );
      for (const r of results) console.log(`  - ${r.sourceDocId}: ${r.chunkCount} chunks`);
    }
    return;
  }

  // Live mode — requires Mongo
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set. Use --dry-run to preview without DB.');
    process.exit(1);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(MONGODB_URI);

  try {
    // Load model (registers it with mongoose)
    require('../models/ClinicalKnowledgeChunk');
    require('../models/RAGRetrieval');

    const provider = require('../services/ai/embeddingProvider');
    const ragServiceFactory = require('../services/ai/rag.service');
    const svc = ragServiceFactory({ embeddingProvider: provider });

    const results = [];
    for (const policy of POLICIES) {
      const r = await svc.ingestDocument(
        {
          ...policy,
          languageHint: 'ar',
          branchId: BRANCH_ID,
          isOrgWide: !BRANCH_ID,
        },
        { replacePreviousVersion: true }
      );
      results.push({ sourceDocId: r.sourceDocId, chunkCount: r.chunkCount });
      if (!JSON_OUT)
        console.log(
          `  ✓ ${r.sourceDocId}: ${r.chunkCount} chunks (provider=${r.embeddingProvider})`
        );
    }

    if (JSON_OUT) {
      console.log(
        JSON.stringify(
          {
            ingested: results.length,
            totalChunks: results.reduce((s, r) => s + r.chunkCount, 0),
            embeddingProvider: provider.getProvider(),
            scope: BRANCH_ID ? `branch:${BRANCH_ID}` : 'org-wide',
            policies: results,
          },
          null,
          2
        )
      );
    } else {
      console.log(
        `\nDone. Ingested ${results.length} policies, ${results.reduce((s, r) => s + r.chunkCount, 0)} total chunks.`
      );
      console.log(`Embedding provider: ${provider.getProvider()}`);
      console.log(`Scope: ${BRANCH_ID ? `branch ${BRANCH_ID}` : 'org-wide'}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('seed-rag-policies failed:', err.message);
  process.exit(1);
});
