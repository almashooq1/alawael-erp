# Risk Management System Documentation

## Overview

This module provides a comprehensive risk management backend and dashboard,
including:

- Risk, RiskAssessment, and RiskEvent models
- RESTful API endpoints for CRUD operations
- Smart dashboard with AI-powered risk scoring and recommendations

## API Endpoints

### Risks

- `GET /api/risks` — List all risks
- `GET /api/risks/:id` — Get a single risk
- `POST /api/risks` — Create a new risk
- `PUT /api/risks/:id` — Update a risk
- `DELETE /api/risks/:id` — Delete a risk

### Risk Assessments

- `GET /api/risk-assessments` — List all assessments
- `POST /api/risk-assessments` — Create a new assessment

### Risk Events

- `GET /api/risk-events` — List all events
- `POST /api/risk-events` — Create a new event

## Models

- **Risk**: title, description, category, likelihood, impact, owner, status
- **RiskAssessment**: risk, assessmentDate, assessedBy, likelihood, impact,
  notes, score
- **RiskEvent**: risk, eventDate, description, reportedBy, impact, actionTaken

## Frontend

- Integrated RiskDashboard in ProcessDashboard
- AI-powered risk scoring and recommendations
- Modern, user-friendly UI

## Testing

- Automated API tests: `risk.api.test.ts`
- Coverage for create, read, update, delete

## Best Practices

- All endpoints are RESTful and secure
- Models are extensible
- Dashboard supports i18n and dark mode

---

_For further details, see code comments and test files._
