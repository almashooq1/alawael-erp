/**
 * WhatsApp AI Intelligence Service — طبقة الذكاء الاصطناعي لواتساب
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Capabilities:
 *   1. Intent Classification  — تصنيف نية الرسالة الواردة
 *   2. Arabic NLP             — معالجة اللغة العربية والعامية الخليجية
 *   3. Sentiment Analysis     — تحليل المشاعر (إيجابي / محايد / سلبي / عاجل)
 *   4. Smart Reply Suggestion — اقتراح ردود ذكية مسبقة الصياغة
 *   5. Auto-Response Engine   — ردود تلقائية للأسئلة الشائعة
 *   6. Context Enrichment     — ربط الرسالة بالسجل الطولي للمستفيد
 *   7. Conversation Summarization — تلخيص المحادثة للسجل السريري
 *
 * AI backend: OpenAI-compatible API (configurable via env).
 * Falls back to rule-based logic when AI is unavailable.
 *
 * @module services/whatsapp/whatsappAI.service
 * @version 1.0.0
 */

'use strict';

const https = require('https');
const logger = require('../../utils/logger');

// ─── OpenAI / Azure OpenAI config ─────────────────────────────────────────
function aiCfg() {
  return {
    enabled: !!process.env.OPENAI_API_KEY || !!process.env.AZURE_OPENAI_KEY,
    apiKey: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '',
    baseUrl: process.env.AZURE_OPENAI_ENDPOINT
      ? `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`
      : 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: 512,
    temperature: 0.3,
  };
}

// ─── LLM call helper ─────────────────────────────────────────────────────
function callLLM(messages, { maxTokens, temperature } = {}) {
  const { apiKey, baseUrl, model } = aiCfg();
  const payload = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens || aiCfg().maxTokens,
    temperature: temperature ?? aiCfg().temperature,
    response_format: { type: 'json_object' },
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/chat/completions`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${apiKey}`,
        ...(process.env.AZURE_OPENAI_KEY ? { 'api-key': apiKey, Authorization: undefined } : {}),
      },
    };

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json?.choices?.[0]?.message?.content || '{}';
          resolve(JSON.parse(text));
        } catch {
          reject(new Error(`LLM parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. INTENT CLASSIFICATION — تصنيف النية
// ═══════════════════════════════════════════════════════════════════════════

const INTENT_MAP = {
  session_inquiry: ['موعد', 'جلسة', 'متى', 'وقت', 'schedule', 'appointment', 'session'],
  progress_inquiry: ['تقدم', 'تحسن', 'كيف', 'progress', 'improvement', 'تطور'],
  complaint: ['شكوى', 'مشكلة', 'سيئ', 'خطأ', 'complaint', 'problem', 'غلط'],
  homework_feedback: ['واجب', 'تمرين', 'أنجز', 'homework', 'exercise', 'فعل', 'مارس'],
  absent_notification: ['غياب', 'مريض', 'مش حاضر', 'absent', 'sick', 'لن يحضر'],
  emergency: ['طارئ', 'إسعاف', 'خطر', 'emergency', 'urgent', 'مستشفى', 'نوبة'],
  positive_feedback: ['شكراً', 'ممتاز', 'رائع', 'thank', 'great', 'excellent', 'بارك'],
  document_request: ['تقرير', 'وثيقة', 'شهادة', 'report', 'document', 'certificate'],
  general_question: [],
};

/**
 * Classify the intent of an incoming WhatsApp message.
 * Uses LLM when available, falls back to keyword matching.
 *
 * @param {string} text - raw message text
 * @param {Object} [context] - beneficiary context (name, recentGoals, etc.)
 * @returns {Promise<{intent:string, confidence:number, entities:Object}>}
 */
async function classifyIntent(text, context = {}) {
  if (!text) return { intent: 'general_question', confidence: 0, entities: {} };

  // LLM path
  if (aiCfg().enabled) {
    try {
      const systemPrompt = `أنت محلل رسائل WhatsApp لمنصة تأهيل طبي.
صنّف الرسالة الواردة وأعد JSON فقط بالشكل:
{
  "intent": "<session_inquiry|progress_inquiry|complaint|homework_feedback|absent_notification|emergency|positive_feedback|document_request|general_question>",
  "confidence": <0.0-1.0>,
  "sentiment": "<positive|neutral|negative|urgent>",
  "entities": {
    "date": "<إن وُجد>",
    "time": "<إن وُجد>",
    "beneficiaryName": "<إن وُجد>",
    "topic": "<موضوع الرسالة>"
  },
  "requiresHumanReview": <true|false>,
  "urgencyLevel": "<low|medium|high|critical>"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `الرسالة: "${text}"\n${context.beneficiaryName ? `المستفيد: ${context.beneficiaryName}` : ''}`,
        },
      ];

      const result = await callLLM(messages);
      return {
        intent: result.intent || 'general_question',
        confidence: result.confidence ?? 0.8,
        sentiment: result.sentiment || 'neutral',
        entities: result.entities || {},
        requiresHumanReview: !!result.requiresHumanReview,
        urgencyLevel: result.urgencyLevel || 'low',
        source: 'llm',
      };
    } catch (err) {
      logger.warn(`[WhatsAppAI] LLM intent classification failed: ${err.message}`);
    }
  }

  // Rule-based fallback
  const lower = text.toLowerCase();
  let bestIntent = 'general_question';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    const score = keywords.filter(k => lower.includes(k.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  const isUrgent = INTENT_MAP.emergency.some(k => lower.includes(k));
  return {
    intent: bestIntent,
    confidence: bestScore > 0 ? Math.min(0.5 + bestScore * 0.1, 0.9) : 0.3,
    sentiment: isUrgent ? 'urgent' : 'neutral',
    entities: {},
    requiresHumanReview: isUrgent || bestIntent === 'complaint',
    urgencyLevel: isUrgent ? 'critical' : 'low',
    source: 'rules',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. SMART REPLY SUGGESTIONS — اقتراح ردود ذكية
// ═══════════════════════════════════════════════════════════════════════════

/** Pre-built reply bank (Arabic + English) */
const REPLY_BANK = {
  session_inquiry: [
    'سيتم تأكيد موعد الجلسة القادمة في أقرب وقت.',
    'جلستكم القادمة يوم {nextSessionDate} الساعة {nextSessionTime}.',
    'يمكنكم الاطلاع على جدول الجلسات عبر بوابة أولياء الأمور.',
  ],
  progress_inquiry: [
    'نُبشّركم بتحقيق تقدم ملحوظ في الأهداف العلاجية هذا الأسبوع.',
    'سيصلكم تقرير التقدم الأسبوعي اليوم.',
    'يسعدنا مشاركتكم تفاصيل التقدم خلال الجلسة القادمة.',
  ],
  homework_feedback: [
    'شكراً جزيلاً على تنفيذ الواجب المنزلي! هذا يعزز التعافي.',
    'أحسنتم! سيتم توثيق إنجاز الواجب في ملف المستفيد.',
    'رائع! استمرار التمارين المنزلية يُسرّع تحقيق الأهداف.',
  ],
  absent_notification: [
    'شكراً للإبلاغ. سيتم إعادة جدولة الجلسة في أقرب وقت.',
    'تلقينا إشعار الغياب وسيتواصل معكم الفريق لتحديد موعد بديل.',
    'نتمنى الشفاء العاجل. سيتم التواصل معكم قريباً.',
  ],
  emergency: [
    '⚠️ تم تلقي رسالتكم العاجلة وسيتواصل معكم مشرف الحالة فوراً.',
    '🆘 تم إبلاغ الفريق الطبي. إذا كانت حالة طارئة يُرجى الاتصال بـ 911.',
  ],
  positive_feedback: [
    'شكراً لكم على كلماتكم الطيبة! تحفزنا لتقديم أفضل رعاية.',
    'سررنا بردّكم الجميل. هدفنا دائماً راحتكم وتقدم {beneficiaryName}.',
  ],
  document_request: [
    'تلقينا طلبكم. سيتم إعداد الوثيقة خلال 24-48 ساعة عمل.',
    'يمكنكم طلب التقارير مباشرة عبر بوابة أولياء الأمور.',
  ],
  complaint: [
    'نعتذر عن أي إزعاج. تم تسجيل ملاحظتكم وسيتواصل معكم المشرف خلال 4 ساعات.',
    'شكراً لإبلاغنا. آراؤكم تساعدنا على التحسين المستمر.',
  ],
  general_question: [
    'تلقينا رسالتكم وسيتم الرد في أقرب وقت.',
    'شكراً للتواصل معنا. سيُبلَّغ الفريق المختص للرد.',
  ],
};

/**
 * Generate smart reply suggestions for a given intent.
 * @param {string} intent
 * @param {Object} [context] - beneficiary data for template substitution
 * @param {number} [count=3] - number of suggestions
 * @returns {Promise<Array<{text:string, type:string}>>}
 */
async function suggestReplies(intent, context = {}, count = 3) {
  let templates = REPLY_BANK[intent] || REPLY_BANK.general_question;

  // LLM enhancement: personalize replies
  if (aiCfg().enabled && context.beneficiaryName) {
    try {
      const prompt = `أنت أخصائي تأهيل تكتب رداً على رسالة واتساب لولي أمر المستفيد ${context.beneficiaryName}.
النية المصنفة: ${intent}
السياق: ${JSON.stringify(context)}
أعد JSON: {"replies": ["رد1", "رد2", "رد3"]}
الردود يجب أن تكون بالعربية، مهنية، مختصرة (أقل من 100 كلمة)، وتراعي السياق العلاجي.`;

      const result = await callLLM([{ role: 'user', content: prompt }], {
        maxTokens: 300,
        temperature: 0.5,
      });
      if (Array.isArray(result.replies) && result.replies.length) {
        templates = result.replies;
      }
    } catch (err) {
      logger.warn(`[WhatsAppAI] Smart reply LLM failed: ${err.message}`);
    }
  }

  // Substitute template variables
  const filled = templates.slice(0, count).map(t =>
    t
      .replace(/{beneficiaryName}/g, context.beneficiaryName || 'المستفيد')
      .replace(/{nextSessionDate}/g, context.nextSessionDate || '')
      .replace(/{nextSessionTime}/g, context.nextSessionTime || '')
  );

  return filled.map((text, i) => ({ id: `reply-${i}`, text, type: intent }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUTO-RESPONSE ENGINE — الردود التلقائية
// ═══════════════════════════════════════════════════════════════════════════

/** Auto-respond to low-complexity intents without staff intervention. */
const AUTO_RESPOND_INTENTS = new Set(['positive_feedback', 'absent_notification']);

/**
 * Decide if an incoming message warrants an automatic reply.
 * Returns the auto-reply text or null if manual review needed.
 *
 * @param {Object} classified - result from classifyIntent()
 * @param {Object} [context]
 * @returns {Promise<string|null>}
 */
async function getAutoReply(classified, context = {}) {
  if (classified.urgencyLevel === 'critical') return null; // always human
  if (!AUTO_RESPOND_INTENTS.has(classified.intent)) return null;

  const suggestions = await suggestReplies(classified.intent, context, 1);
  return suggestions[0]?.text || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CONVERSATION SUMMARIZATION — تلخيص المحادثة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Summarize a conversation thread for clinical documentation.
 * @param {Array<{direction:string, text:string, timestamp:Date}>} messages
 * @param {Object} [context] - beneficiary context
 * @returns {Promise<{summary:string, keyPoints:string[], actionItems:string[]}>}
 */
async function summarizeConversation(messages, context = {}) {
  if (!messages?.length) {
    return { summary: 'لا توجد رسائل للتلخيص', keyPoints: [], actionItems: [] };
  }

  const transcript = messages
    .map(m => `[${m.direction === 'outgoing' ? 'الفريق' : 'الأسرة'}]: ${m.text || ''}`)
    .join('\n');

  if (!aiCfg().enabled) {
    return {
      summary: `محادثة تضم ${messages.length} رسالة بين الفريق وأسرة المستفيد.`,
      keyPoints: [],
      actionItems: [],
      source: 'fallback',
    };
  }

  try {
    const prompt = `لخّص المحادثة التالية مع أسرة المستفيد ${context.beneficiaryName || ''} وأعد JSON:
{
  "summary": "<ملخص 2-3 جمل>",
  "keyPoints": ["<نقطة 1>", "<نقطة 2>"],
  "actionItems": ["<إجراء 1>", "<إجراء 2>"],
  "sentiment": "<positive|neutral|negative|urgent>",
  "followUpRequired": <true|false>
}

المحادثة:
${transcript.slice(0, 3000)}`;

    const result = await callLLM([{ role: 'user', content: prompt }], { maxTokens: 400 });
    return { ...result, source: 'llm' };
  } catch (err) {
    logger.warn(`[WhatsAppAI] Summarization failed: ${err.message}`);
    return {
      summary: `محادثة تضم ${messages.length} رسالة.`,
      keyPoints: [],
      actionItems: [],
      source: 'fallback',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PROACTIVE INSIGHTS — رؤى استباقية
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze communication patterns and return insights for staff.
 * @param {Array<Object>} conversations - recent communication records
 * @returns {Object} - engagement score, flags, recommendations
 */
function analyzeEngagementPatterns(conversations) {
  if (!conversations?.length) {
    return { engagementScore: 0, flags: [], recommendations: [] };
  }

  const total = conversations.length;
  const incoming = conversations.filter(c => c.direction === 'incoming').length;
  const complaints = conversations.filter(c => c.intent === 'complaint').length;
  const noReplies = conversations.filter(c => c.direction === 'incoming' && !c.wasRepliedTo).length;
  const avgResponseMinutes =
    conversations
      .filter(c => c.responseTimeMinutes != null)
      .reduce((s, c) => s + c.responseTimeMinutes, 0) /
    Math.max(conversations.filter(c => c.responseTimeMinutes != null).length, 1);

  const engagementScore = Math.min(
    100,
    Math.round(
      (incoming / Math.max(total, 1)) * 40 + (1 - complaints / Math.max(total, 1)) * 30 + 30
    )
  );

  const flags = [];
  if (noReplies > 2)
    flags.push({ type: 'unanswered_messages', count: noReplies, severity: 'high' });
  if (complaints > 1)
    flags.push({ type: 'multiple_complaints', count: complaints, severity: 'medium' });
  if (avgResponseMinutes > 240)
    flags.push({
      type: 'slow_response',
      avgMinutes: Math.round(avgResponseMinutes),
      severity: 'medium',
    });

  const recommendations = [];
  if (flags.some(f => f.type === 'unanswered_messages'))
    recommendations.push('مراجعة الرسائل غير المجاب عليها فوراً');
  if (flags.some(f => f.type === 'slow_response'))
    recommendations.push('تفعيل الردود التلقائية لتحسين وقت الاستجابة');
  if (engagementScore < 40) recommendations.push('التواصل الاستباقي مع الأسرة لتعزيز المشاركة');

  return {
    engagementScore,
    flags,
    recommendations,
    responseTimeAvgMinutes: Math.round(avgResponseMinutes),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

const whatsappAIService = {
  classifyIntent,
  suggestReplies,
  getAutoReply,
  summarizeConversation,
  analyzeEngagementPatterns,
  isAIEnabled: () => aiCfg().enabled,
};

module.exports = whatsappAIService;
