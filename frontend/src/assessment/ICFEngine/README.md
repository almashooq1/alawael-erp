# ICF Assessment Engine - Al-Awael ERP

## Overview

The **ICF Assessment Engine** is a comprehensive, professional, and intelligent module built for the Al-Awael ERP system, specifically designed for **rehabilitation centers** serving children and youth with disabilities (including autism, cerebral palsy, and general rehabilitation cases).

This engine implements the **WHO ICF-CY Framework** (International Classification of Functioning, Disability and Health for Children and Youth), providing a standardized, evidence-based approach to assessment, goal planning, and progress tracking.

---

## Features

### 1. Core Sets (مجموعات التقييم الأساسية)

Pre-configured assessment sets for different conditions:

- **General Rehabilitation** (`icf-cy-rehab.json`) - 68 required codes + 45 optional codes
- **Autism Spectrum Disorder** (`icf-cy-autism.json`) - 79 required codes + 38 optional codes
- **Cerebral Palsy** (`icf-cy-cp.json`) - 79 required codes + 38 optional codes

Each Core Set includes:
- Arabic and English labels for all codes
- Priority levels (high/medium/low)
- Assessment guidelines and recommended tools
- Scoring instructions

### 2. ICF-CY Codes (أكواد ICF-CY)

Complete code library covering:

| Domain | Code Prefix | Description |
|--------|-------------|-------------|
| Body Functions | `b` | Mental, sensory, voice, cardiovascular, musculoskeletal |
| Body Structures | `s` | Nervous system, eye, ear, heart, limbs |
| Activities & Participation | `d` | Learning, communication, mobility, self-care, domestic life, interpersonal, education, work, community |
| Environmental Factors | `e` | Products, natural environment, support, attitudes, services |
| Personal Factors | `p` | Demographic, psychological, social, disability-related |

### 3. Qualifier Scoring (مؤهلات التقييم)

Three qualifier types with 0-4 scales:

- **Performance** (الأداء) - What the person does in their current environment
- **Capacity** (القدرة) - What the person can do in a standardized environment
- **Environmental** (البيئة) - Impact of environmental factors (-4 to +4)

### 4. Frontend Components (مكونات الواجهة الأمامية)

#### ICFForm
Main assessment form with:
- Domain tabs with animated transitions
- Stepper wizard for assessment flow
- Overall score dashboard
- Real-time score calculation
- Save/Submit functionality

#### ICFDomainSelector
- Accordion-based code selector
- Required vs Optional code separation
- Status indicators (complete/partial/none)
- Score preview chips

#### ICFQualifierSlider
- Interactive slider for each qualifier
- Color-coded scale indicators
- "Unspecified" and "Not Applicable" buttons
- Tooltip descriptions

#### ICFGoalLinker
- Goal linking interface
- Search and filter goals
- Add/Remove goal links
- Dialog-based interaction

#### ICFProgressChart
- Line chart (trend over time)
- Radar chart (domain comparison)
- Bar chart (current vs previous)
- Trend indicators with icons
- Responsive design

### 5. Hooks (Hooks)

#### useICFAssessment
- Manages assessment state
- CRUD operations via React Query
- Score calculations
- Validation
- Cache management

#### useICFProgress
- Progress tracking over time
- Trend analysis
- Improvement summaries
- Fastest improving/worsening domains

### 6. Utilities (أدوات مساعدة)

#### icfCalculator
- `calculateDomainScore()` - Calculate average score for a domain
- `calculateOverallScore()` - Calculate overall assessment score
- `calculateWeightedDomainScore()` - Weighted domain scoring
- `calculateImprovement()` - Compare two assessments
- `calculatePercentileRank()` - Percentile ranking
- `calculateReliability()` - Cronbach's alpha
- `calculateStandardError()` - Standard error of measurement
- `calculateConfidenceInterval()` - Confidence intervals
- `calculateCompositeScore()` - Multi-domain composite scoring
- `calculateGASScore()` - Goal Attainment Scaling

#### icfGoalPredictor
- `predictGoals()` - AI-powered goal prediction based on assessment data
- `calculateGoalProbability()` - Probability of achieving a goal
- `recommendInterventions()` - Intervention strategy recommendations

#### icfReportGenerator
- `generateReport()` - Comprehensive assessment report
- `exportToPDF()` - PDF export
- `exportToWord()` - Word export
- `exportToJSON()` - JSON export

### 7. Backend (الخلفية)

#### ICFAssessment Model
- MongoDB schema with comprehensive fields
- Pre-save score calculation
- Domain comparison methods
- Static methods for queries and statistics
- Virtuals for age calculation

#### ICF Routes
- `POST /api/v1/assessment/icf` - Create assessment
- `GET /api/v1/assessment/icf/patient/:patientId` - Get patient assessments
- `GET /api/v1/assessment/icf/patient/:patientId/latest` - Get latest assessment
- `GET /api/v1/assessment/icf/:id` - Get specific assessment
- `PUT /api/v1/assessment/icf/:id` - Update assessment
- `POST /api/v1/assessment/icf/:id/submit` - Submit assessment
- `DELETE /api/v1/assessment/icf/:id` - Delete assessment
- `GET /api/v1/assessment/icf/:id/compare/:otherId` - Compare assessments
- `GET /api/v1/assessment/icf/stats/overview` - Get statistics
- `GET /api/v1/assessment/icf/patient/:patientId/progress` - Get progress data

### 8. Tests (اختبارات)

- API endpoint tests (CRUD operations)
- Validation tests
- Progress tracking tests
- Statistics tests
- Role-based access tests

---

## File Structure

```
frontend/src/assessment/ICFEngine/
├── coreSets/
│   ├── icf-cy-codes.js          # Complete ICF-CY code library
│   ├── icf-cy-rehab.json        # Rehabilitation Core Set
│   ├── icf-cy-autism.json       # Autism Core Set
│   └── icf-cy-cp.json           # Cerebral Palsy Core Set
├── components/
│   ├── ICFForm.jsx              # Main assessment form
│   ├── ICFDomainSelector.jsx    # Domain code selector
│   ├── ICFQualifierSlider.jsx   # Qualifier slider component
│   ├── ICFGoalLinker.jsx        # Goal linking component
│   └── ICFProgressChart.jsx     # Progress visualization
├── hooks/
│   ├── useICFAssessment.js      # Assessment management hook
│   └── useICFProgress.js        # Progress tracking hook
├── utils/
│   ├── icfCalculator.js         # Score calculation utilities
│   ├── icfGoalPredictor.js      # AI goal prediction
│   └── icfReportGenerator.js   # Report generation
└── index.js                     # Main entry point

backend/models/assessment/
└── ICFAssessment.js             # MongoDB model

backend/routes/assessment/
└── icfRoutes.js                 # API routes

backend/tests/assessment/
└── icf.test.js                  # API tests
```

---

## Usage

### Import Components

```javascript
import { 
  ICFForm, 
  ICFProgressChart,
  useICFAssessment,
  useICFProgress,
  generateReport,
  predictGoals 
} from '@/assessment/ICFEngine';
```

### Use in a Page

```jsx
function AssessmentPage({ patientId }) {
  return (
    <ICFForm 
      patientId={patientId}
      coreSetType="autism"
      onSave={(data) => console.log('Saved:', data)}
      onSubmit={(data) => console.log('Submitted:', data)}
    />
  );
}
```

### Generate Report

```javascript
const report = generateReport(assessment, previousAssessment, {
  name: 'Patient Name',
  age: 8,
  diagnosis: 'Autism Spectrum Disorder'
});
```

### Predict Goals

```javascript
const goals = predictGoals(
  currentScores, 
  historicalData, 
  { age: 8, diagnosis: 'autism', severity: 'moderate' }
);
```

---

## Integration

### Backend Integration

1. Add routes to main app:

```javascript
// app.js
const icfRoutes = require('./routes/assessment/icfRoutes');
app.use('/api/v1/assessment/icf', icfRoutes);
```

2. The model automatically calculates scores on save via pre-save middleware.

### Frontend Integration

1. The components are self-contained and use MUI + Recharts.
2. React Query is used for data fetching and caching.
3. Framer Motion provides animations.

---

## Assessment Guidelines

### Recommended Frequency
- **Active rehabilitation**: Every 3 months
- **Stable patients**: Every 6 months
- **Monitoring**: Every 6-12 months

### Minimum Assessors
- **General**: 2 assessors
- **Autism**: 3 assessors (Autism Specialist, Psychologist, Speech Therapist)
- **CP**: 3 assessors (CP Specialist, Physiotherapist, Occupational Therapist)

### Assessment Duration
- **General**: 60-90 minutes
- **Autism**: 90-120 minutes
- **CP**: 90-120 minutes

### Required Tools
- Goniometer, Dynamometer, Balance board
- Standardized tests (GMFCS, MACS, CFCS, ADOS-2, ADIR, CARS-2)
- Cognitive assessment tools
- Communication assessment tools

---

## Scoring Instructions

1. Rate each code using **Performance** qualifier (what the person does in current environment)
2. Rate each code using **Capacity** qualifier (what the person can do in standardized environment)
3. Rate environmental factors using **Environmental** qualifier (-4 to +4)
4. Use **8** for not specified, **9** for not applicable
5. Document specific barriers and facilitators for each code

---

## License

This module is part of the Al-Awael ERP system and follows the same licensing terms.

---

## Contributors

- Al-Awael Development Team
- Rehabilitation Specialists
- ICF-CY Framework (WHO)

---

## Support

For support, please contact the Al-Awael development team or refer to the main ERP documentation.

---

## Changelog

### v1.0.0 (Initial Release)
- Complete ICF-CY implementation
- Core Sets for Rehab, Autism, CP
- Full frontend components
- Backend API with MongoDB
- AI-powered goal prediction
- Comprehensive reporting
- Progress tracking and visualization
- Test suite

---

**Built with ❤️ for Al-Awael Rehabilitation Centers**