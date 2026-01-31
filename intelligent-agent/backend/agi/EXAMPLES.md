# 🎯 AGI System - Usage Examples

## أمثلة عملية لاستخدام نظام AGI

---

## 1️⃣ البدء السريع (Quick Start)

### تشغيل النظام

```bash
# الانتقال إلى مجلد AGI
cd intelligent-agent/backend/agi

# تثبيت التبعيات
npm install

# تشغيل السيرفر
npm run dev
```

السيرفر سيعمل على: `http://localhost:5001`

---

## 2️⃣ أمثلة API

### مثال 1: معالجة عامة (General Processing)

**السيناريو:** طرح سؤال عام على النظام

```bash
curl -X POST http://localhost:5001/api/agi/process \
  -H "Content-Type: application/json" \
  -d '{
    "input": "كيف يمكنني حل مشكلة التغير المناخي؟",
    "context": {
      "domain": "environment",
      "urgency": "high"
    }
  }'
```

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "result": {
    "understanding": {
      "intent": "problem-solving",
      "domain": "environment",
      "complexity": "high"
    },
    "plan": {
      "steps": [...],
      "horizon": "long_term"
    },
    "decisions": [...],
    "status": "completed"
  }
}
```

---

### مثال 2: التفكير المنطقي (Reasoning)

**السيناريو:** استخدام المنطق الاستنتاجي

```bash
curl -X POST http://localhost:5001/api/agi/reason \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "تحديد إذا كان النظام آمناً",
    "evidence": [
      "النظام يستخدم HTTPS",
      "النظام لديه مصادقة",
      "النظام لا يحتوي على تحقق من المدخلات"
    ],
    "method": "deductive"
  }'
```

**الاستخدام في JavaScript:**

```javascript
const axios = require('axios');

async function reasonAboutSecurity() {
  const response = await axios.post('http://localhost:5001/api/agi/reason', {
    goal: 'تحديد إذا كان النظام آمناً',
    evidence: [
      'النظام يستخدم HTTPS',
      'النظام لديه مصادقة',
      'النظام لا يحتوي على تحقق من المدخلات',
    ],
    method: 'deductive',
  });

  console.log('Reasoning Result:', response.data.result);
}

reasonAboutSecurity();
```

---

### مثال 3: التعلم (Learning)

**السيناريو:** تعلم نمط من البيانات

```bash
curl -X POST http://localhost:5001/api/agi/learn \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "patterns": [1, 1, 2, 3, 5, 8, 13, 21]
    },
    "mode": "unsupervised"
  }'
```

**الاستخدام في Python:**

```python
import requests
import json

def learn_fibonacci():
    url = 'http://localhost:5001/api/agi/learn'
    data = {
        'data': {
            'patterns': [1, 1, 2, 3, 5, 8, 13, 21]
        },
        'mode': 'unsupervised'
    }

    response = requests.post(url, json=data)
    result = response.json()

    print('Learning Result:', json.dumps(result, indent=2))

learn_fibonacci()
```

---

### مثال 4: اتخاذ القرار (Decision Making)

**السيناريو:** اختيار استراتيجية استثمار

```bash
curl -X POST http://localhost:5001/api/agi/decide \
  -H "Content-Type: application/json" \
  -d '{
    "situation": "اختيار استراتيجية استثمار مع رأس مال محدود",
    "options": [
      "أسهم تقنية عالية المخاطر",
      "سندات حكومية منخفضة المخاطر",
      "عقارات متوسطة المخاطر",
      "صناديق متنوعة"
    ],
    "criteria": [
      "العائد المتوقع",
      "مستوى المخاطر",
      "السيولة",
      "الأفق الزمني"
    ]
  }'
```

**الاستخدام في TypeScript:**

```typescript
import axios from 'axios';

interface DecisionRequest {
  situation: string;
  options: string[];
  criteria: string[];
}

async function makeInvestmentDecision() {
  const request: DecisionRequest = {
    situation: 'اختيار استراتيجية استثمار مع رأس مال محدود',
    options: [
      'أسهم تقنية عالية المخاطر',
      'سندات حكومية منخفضة المخاطر',
      'عقارات متوسطة المخاطر',
      'صناديق متنوعة',
    ],
    criteria: ['العائد المتوقع', 'مستوى المخاطر', 'السيولة', 'الأفق الزمني'],
  };

  const response = await axios.post(
    'http://localhost:5001/api/agi/decide',
    request
  );

  console.log('Decision:', response.data.result.selectedOption);
  console.log('Reasoning:', response.data.result.reasoning);
}

makeInvestmentDecision();
```

---

### مثال 5: الإبداع والابتكار (Creativity)

**السيناريو:** توليد حلول مبتكرة لمشكلة مرورية

```bash
curl -X POST http://localhost:5001/api/agi/create \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "تصميم نظام نقل جديد للمدن المزدحمة",
    "constraints": [
      "صديق للبيئة",
      "فعال من حيث التكلفة",
      "قابل للتوسع",
      "يدعم الوصول الشامل"
    ],
    "outcomes": [
      "تقليل الازدحام بنسبة 50%",
      "خفض الانبعاثات بنسبة 70%",
      "تحسين إمكانية الوصول للجميع"
    ],
    "domain": "urban-planning"
  }'
```

**الاستخدام في Node.js:**

```javascript
const axios = require('axios');

async function generateTransportSolution() {
  const response = await axios.post('http://localhost:5001/api/agi/create', {
    problem: 'تصميم نظام نقل جديد للمدن المزدحمة',
    constraints: [
      'صديق للبيئة',
      'فعال من حيث التكلفة',
      'قابل للتوسع',
      'يدعم الوصول الشامل',
    ],
    outcomes: [
      'تقليل الازدحام بنسبة 50%',
      'خفض الانبعاثات بنسبة 70%',
      'تحسين إمكانية الوصول للجميع',
    ],
    domain: 'urban-planning',
  });

  const solutions = response.data.result;

  solutions.forEach((solution, index) => {
    console.log(`\nSolution ${index + 1}:`);
    console.log(`Novelty: ${solution.novelty}`);
    console.log(`Feasibility: ${solution.feasibility}`);
    console.log(`Description: ${solution.content}`);
  });
}

generateTransportSolution();
```

---

### مثال 6: التخطيط طويل المدى (Long-term Planning)

**السيناريو:** التخطيط لإطلاق شركة ناشئة

```bash
curl -X POST http://localhost:5001/api/agi/plan \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "إطلاق شركة ناشئة ناجحة في مجال AI",
    "deadline": "2026-12-31",
    "constraints": [
      "ميزانية محدودة: 50000 دولار",
      "فريق صغير: 3 أشخاص",
      "منافسة عالية في السوق"
    ],
    "resources": [
      {"type": "money", "amount": 50000, "unit": "USD"},
      {"type": "people", "amount": 3, "unit": "persons"},
      {"type": "time", "amount": 12, "unit": "months"}
    ],
    "horizon": "long_term"
  }'
```

---

## 3️⃣ أمثلة متقدمة

### مثال: سلسلة معالجة معقدة

```javascript
const axios = require('axios');

async function complexAGIWorkflow() {
  // 1. فهم المشكلة
  const understanding = await axios.post(
    'http://localhost:5001/api/agi/process',
    {
      input: 'نحتاج لتحسين تجربة المستخدم في تطبيقنا',
      context: { domain: 'UX', current_satisfaction: 6.5 },
    }
  );

  console.log('Understanding:', understanding.data);

  // 2. توليد حلول مبتكرة
  const solutions = await axios.post('http://localhost:5001/api/agi/create', {
    problem: understanding.data.result.understanding.intent,
    constraints: ['ميزانية محدودة', 'وقت قصير'],
    domain: 'UX',
  });

  console.log('Creative Solutions:', solutions.data);

  // 3. تقييم الحلول واتخاذ القرار
  const decision = await axios.post('http://localhost:5001/api/agi/decide', {
    situation: 'اختيار أفضل حل لتحسين UX',
    options: solutions.data.result.slice(0, 3).map(s => s.content),
    criteria: ['التكلفة', 'التأثير', 'وقت التنفيذ'],
  });

  console.log('Decision:', decision.data);

  // 4. إنشاء خطة تنفيذ
  const plan = await axios.post('http://localhost:5001/api/agi/plan', {
    goal: `تنفيذ الحل: ${decision.data.result.selectedOption}`,
    deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    horizon: 'medium_term',
  });

  console.log('Execution Plan:', plan.data);

  // 5. التعلم من العملية
  await axios.post('http://localhost:5001/api/agi/learn', {
    data: {
      problem: understanding.data,
      solutions: solutions.data,
      decision: decision.data,
      plan: plan.data,
    },
    mode: 'reinforcement',
  });

  console.log('Workflow completed and learned!');
}

complexAGIWorkflow().catch(console.error);
```

---

### مثال: دمج مع React Frontend

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function AGIInterface() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const processWithAGI = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/agi/process',
        {
          input,
          context: {},
        }
      );
      setResult(response.data.result);
    } catch (error) {
      console.error('AGI Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agi-interface">
      <h1>🧠 AGI System</h1>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="أدخل سؤالك أو مشكلتك هنا..."
        rows={5}
        style={{ width: '100%' }}
      />

      <button onClick={processWithAGI} disabled={loading}>
        {loading ? 'Processing...' : 'Process with AGI'}
      </button>

      {result && (
        <div className="result">
          <h2>Result:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default AGIInterface;
```

---

## 4️⃣ حالات استخدام عملية

### حالة 1: مساعد بحث علمي

```python
import requests

class AIResearchAssistant:
    def __init__(self):
        self.agi_url = 'http://localhost:5001/api/agi'

    def research_question(self, question):
        # استخدام التفكير المنطقي
        response = requests.post(f'{self.agi_url}/reason', json={
            'goal': question,
            'evidence': [],
            'method': 'abductive'
        })
        return response.json()

    def generate_hypothesis(self, observation):
        # استخدام الإبداع
        response = requests.post(f'{self.agi_url}/create', json={
            'problem': f'Generate hypothesis for: {observation}',
            'domain': 'science'
        })
        return response.json()

    def plan_experiment(self, hypothesis):
        # استخدام التخطيط
        response = requests.post(f'{self.agi_url}/plan', json={
            'goal': f'Design experiment to test: {hypothesis}',
            'horizon': 'medium_term'
        })
        return response.json()

# استخدام
assistant = AIResearchAssistant()
result = assistant.research_question('What causes quantum entanglement?')
print(result)
```

---

### حالة 2: مستشار استراتيجي للأعمال

```javascript
class BusinessAdvisor {
  constructor() {
    this.agiUrl = 'http://localhost:5001/api/agi';
  }

  async analyzeMarket(marketData) {
    const response = await fetch(`${this.agiUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: 'تحليل بيانات السوق',
        context: { data: marketData, type: 'market-analysis' },
      }),
    });
    return response.json();
  }

  async strategicPlanning(companyGoals) {
    const response = await fetch(`${this.agiUrl}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: companyGoals,
        horizon: 'strategic',
      }),
    });
    return response.json();
  }

  async competitiveAnalysis(competitors) {
    const response = await fetch(`${this.agiUrl}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        situation: 'تحليل المنافسين واختيار استراتيجية',
        options: competitors,
        criteria: ['قوة السوق', 'الابتكار', 'رضا العملاء'],
      }),
    });
    return response.json();
  }
}

// استخدام
const advisor = new BusinessAdvisor();
const strategy = await advisor.strategicPlanning('زيادة حصة السوق بنسبة 20%');
console.log(strategy);
```

---

## 5️⃣ نصائح وأفضل الممارسات

### 1. استخدام السياق بفعالية

```javascript
// ❌ سيء
await axios.post('/api/agi/process', { input: 'solve this' });

// ✅ جيد
await axios.post('/api/agi/process', {
  input: 'solve climate change',
  context: {
    domain: 'environment',
    urgency: 'high',
    constraints: ['budget: $1M', 'time: 5 years'],
    previousSolutions: [...]
  }
});
```

### 2. معالجة الأخطاء

```javascript
try {
  const result = await axios.post('/api/agi/process', data);
  return result.data;
} catch (error) {
  if (error.response) {
    console.error('AGI Error:', error.response.data.error);
  } else {
    console.error('Network Error:', error.message);
  }
}
```

### 3. التعلم المستمر

```javascript
// بعد كل عملية، علّم النظام من النتيجة
async function processAndLearn(input, context) {
  const result = await processWithAGI(input, context);

  // تعلم من النتيجة
  await axios.post('/api/agi/learn', {
    data: { input, context, result },
    mode: 'reinforcement',
  });

  return result;
}
```

---

## 6️⃣ مراقبة الأداء

### فحص الحالة

```bash
curl http://localhost:5001/api/agi/status
```

### الحصول على القدرات

```bash
curl http://localhost:5001/api/agi/capabilities
```

---

## 7️⃣ استكشاف الأخطاء

### المشكلة: النظام لا يستجيب

```bash
# فحص الصحة
curl http://localhost:5001/health

# إعادة تشغيل النظام
npm run dev
```

### المشكلة: نتائج غير متوقعة

```javascript
// زيادة مستوى التفصيل في السياق
const result = await axios.post('/api/agi/process', {
  input: 'your input',
  context: {
    verbose: true,
    debug: true,
    explainReasoning: true,
  },
});
```

---

## 📚 موارد إضافية

- **التوثيق الكامل:** [README_AGI.md](./README_AGI.md)
- **الكود المصدري:** `backend/agi/`
- **الاختبارات:** `backend/agi/agi.test.ts`

---

**Happy Building with AGI! 🚀🧠**
