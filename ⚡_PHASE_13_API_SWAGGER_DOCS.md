# Swagger API Documentation

## Phase 13 - Specialized Programs, Advanced Sessions & Smart Scheduler

```yaml
openapi: 3.0.0
info:
  title: AlAWAEL Phase 13 API
  description:
    API documentation for Specialized Programs and Advanced Sessions Management
  version: 1.0.0
  contact:
    name: AlAWAEL Support
    email: support@alawael.com

servers:
  - url: http://localhost:5000
    description: Development Server
  - url: https://api.alawael.com
    description: Production Server

tags:
  - name: Specialized Programs
    description: Manage specialized programs for different disability types
  - name: Advanced Sessions
    description: Track and manage therapy/education sessions
  - name: Smart Scheduler
    description: Intelligent scheduling system

components:
  schemas:
    SpecializedProgram:
      type: object
      required:
        - name
        - code
        - disabilityType
      properties:
        _id:
          type: string
          format: ObjectId
        name:
          type: string
          example: 'برنامج العلاج الطبيعي'
        code:
          type: string
          example: 'PROG-MOTOR-001'
        description:
          type: string
        disabilityType:
          type: string
          enum:
            [
              MOTOR,
              VISUAL,
              HEARING,
              INTELLECTUAL,
              DEVELOPMENTAL,
              COMMUNICATION,
              MULTIPLE,
            ]
        supportedSeverityLevels:
          type: array
          items:
            type: string
            enum: [MILD, MODERATE, SEVERE, PROFOUND]
        sessionConfig:
          type: object
          properties:
            standardDuration:
              type: number
              description: Session duration in minutes
              example: 60
            frequencyPerWeek:
              type: number
              example: 2
            maxConcurrentParticipants:
              type: number
              example: 1
        ageGroup:
          type: object
          properties:
            min:
              type: number
            max:
              type: number
        statistics:
          type: object
          properties:
            totalBeneficiaries:
              type: number
            successRate:
              type: number
            averageOutcomeImprovement:
              type: number
        pricing:
          type: object
          properties:
            sessionCost:
              type: number
            packagePrice:
              type: object
              properties:
                sessions:
                  type: number
                price:
                  type: number
        isActive:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    AdvancedSession:
      type: object
      required:
        - beneficiaryId
        - programId
        - specialistId
        - title
        - scheduledDateTime
      properties:
        _id:
          type: string
          format: ObjectId
        beneficiaryId:
          type: string
          format: ObjectId
        programId:
          type: string
          format: ObjectId
        specialistId:
          type: string
          format: ObjectId
        title:
          type: string
        description:
          type: string
        scheduledDateTime:
          type: string
          format: date-time
        scheduledDuration:
          type: number
          description: Duration in minutes
        sessionStatus:
          type: string
          enum:
            [scheduled, in_progress, completed, cancelled, rescheduled, no_show]
        beneficiaryAttendance:
          type: object
          properties:
            status:
              type: string
              enum: [present, absent, late, excused, partial]
            arrivalTime:
              type: string
              format: date-time
            departureTime:
              type: string
              format: date-time
            remarks:
              type: string
        performanceAssessment:
          type: object
          properties:
            overallEngagement:
              type: string
              enum: [poor, fair, good, very_good, excellent]
            engagement:
              type: string
            motivation:
              type: string
              enum: [low, medium, high]
            concentration:
              type: string
            cooperation:
              type: string
            progressTowardGoals:
              type: string
            estimatedGoalAttainment:
              type: number
              description: Percentage 0-100
        implementedActivities:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              completed:
                type: boolean
              competencyLevel:
                type: string
              modifications:
                type: string
              successIndicators:
                type: array
                items:
                  type: string

    SmartScheduler:
      type: object
      required:
        - beneficiaryId
        - programId
        - frequency
        - sessionsPerWeek
      properties:
        _id:
          type: string
          format: ObjectId
        beneficiaryId:
          type: string
          format: ObjectId
        programId:
          type: string
          format: ObjectId
        frequency:
          type: string
          enum: [weekly, biweekly, monthly]
        sessionsPerWeek:
          type: number
        planDuration:
          type: number
          description: Duration in days
        status:
          type: string
          enum: [draft, review, approved, active, completed, cancelled]
        schedulingPlan:
          type: object
          properties:
            suggestions:
              type: array
              items:
                type: object
                properties:
                  scheduledDateTime:
                    type: string
                    format: date-time
                  recommendedSpecialist:
                    type: object
                  confidenceScore:
                    type: number
                    description: 0-100
        analytics:
          type: object
          properties:
            schedulingEfficiency:
              type: number
            resourceUtilization:
              type: number
            specialistUtilization:
              type: number

    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
        error:
          type: string
        details:
          type: array
          items:
            type: string

  responses:
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Unauthorized:
      description: Unauthorized access
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Forbidden:
      description: Access forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  parameters:
    ProgramId:
      name: id
      in: path
      required: true
      description: Program ID
      schema:
        type: string
        format: ObjectId

    SessionId:
      name: id
      in: path
      required: true
      description: Session ID
      schema:
        type: string
        format: ObjectId

    SchedulerId:
      name: id
      in: path
      required: true
      description: Scheduler ID
      schema:
        type: string
        format: ObjectId

    PageQuery:
      name: page
      in: query
      required: false
      schema:
        type: integer
        default: 1

    LimitQuery:
      name: limit
      in: query
      required: false
      schema:
        type: integer
        default: 10

paths:
  /api/programs:
    get:
      tags:
        - Specialized Programs
      summary: Get all programs
      parameters:
        - $ref: '#/components/parameters/PageQuery'
        - $ref: '#/components/parameters/LimitQuery'
      responses:
        '200':
          description: List of programs
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/SpecializedProgram'
                  pagination:
                    type: object
                    properties:
                      page:
                        type: integer
                      limit:
                        type: integer
                      total:
                        type: integer

    post:
      tags:
        - Specialized Programs
      summary: Create new program
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - code
                - disabilityType
              properties:
                name:
                  type: string
                code:
                  type: string
                disabilityType:
                  type: string
                description:
                  type: string
                sessionConfig:
                  type: object
      responses:
        '201':
          description: Program created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SpecializedProgram'
        '400':
          $ref: '#/components/responses/BadRequest'

  /api/programs/{id}:
    get:
      tags:
        - Specialized Programs
      summary: Get program by ID
      parameters:
        - $ref: '#/components/parameters/ProgramId'
      responses:
        '200':
          description: Program details
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SpecializedProgram'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      tags:
        - Specialized Programs
      summary: Update program
      parameters:
        - $ref: '#/components/parameters/ProgramId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
      responses:
        '200':
          description: Program updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SpecializedProgram'

    delete:
      tags:
        - Specialized Programs
      summary: Delete/Archive program
      parameters:
        - $ref: '#/components/parameters/ProgramId'
      responses:
        '200':
          description: Program archived
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string

  /api/programs/by-disability/{type}:
    get:
      tags:
        - Specialized Programs
      summary: Get programs by disability type
      parameters:
        - name: type
          in: path
          required: true
          schema:
            type: string
            enum:
              [
                MOTOR,
                VISUAL,
                HEARING,
                INTELLECTUAL,
                DEVELOPMENTAL,
                COMMUNICATION,
                MULTIPLE,
              ]
      responses:
        '200':
          description: Programs filtered by disability type
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/SpecializedProgram'

  /api/programs/{id}/statistics:
    get:
      tags:
        - Specialized Programs
      summary: Get program statistics
      parameters:
        - $ref: '#/components/parameters/ProgramId'
      responses:
        '200':
          description: Program statistics
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      totalBeneficiaries:
                        type: number
                      totalSessions:
                        type: number
                      successRate:
                        type: number

  /api/sessions:
    get:
      tags:
        - Advanced Sessions
      summary: Get all sessions
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [scheduled, in_progress, completed, cancelled]
        - name: beneficiaryId
          in: query
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: List of sessions
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/AdvancedSession'

    post:
      tags:
        - Advanced Sessions
      summary: Create new session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - beneficiaryId
                - programId
                - specialistId
                - title
                - scheduledDateTime
              properties:
                beneficiaryId:
                  type: string
                programId:
                  type: string
                specialistId:
                  type: string
                title:
                  type: string
                description:
                  type: string
                scheduledDateTime:
                  type: string
                  format: date-time
                scheduledDuration:
                  type: number
      responses:
        '201':
          description: Session created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/AdvancedSession'

  /api/sessions/{id}:
    get:
      tags:
        - Advanced Sessions
      summary: Get session by ID
      parameters:
        - $ref: '#/components/parameters/SessionId'
      responses:
        '200':
          description: Session details
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/AdvancedSession'

  /api/sessions/{id}/start:
    post:
      tags:
        - Advanced Sessions
      summary: Start session
      parameters:
        - $ref: '#/components/parameters/SessionId'
      responses:
        '200':
          description: Session started
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/AdvancedSession'

  /api/sessions/{id}/complete:
    post:
      tags:
        - Advanced Sessions
      summary: Complete session
      parameters:
        - $ref: '#/components/parameters/SessionId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                beneficiaryAttendance:
                  type: object
                performanceAssessment:
                  type: object
                implementedActivities:
                  type: array
      responses:
        '200':
          description: Session completed
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/AdvancedSession'

  /api/sessions/{id}/report:
    get:
      tags:
        - Advanced Sessions
      summary: Get session report
      parameters:
        - $ref: '#/components/parameters/SessionId'
      responses:
        '200':
          description: Session report
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object

  /api/scheduler/create-schedule:
    post:
      tags:
        - Smart Scheduler
      summary: Create smart schedule
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - beneficiaryId
                - programId
                - frequency
                - sessionsPerWeek
              properties:
                beneficiaryId:
                  type: string
                programId:
                  type: string
                frequency:
                  type: string
                sessionsPerWeek:
                  type: number
                planDuration:
                  type: number
      responses:
        '201':
          description: Schedule created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SmartScheduler'

  /api/scheduler/{id}/generate-suggestions:
    post:
      tags:
        - Smart Scheduler
      summary: Generate schedule suggestions
      parameters:
        - $ref: '#/components/parameters/SchedulerId'
      responses:
        '200':
          description: Suggestions generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SmartScheduler'

  /api/scheduler/{id}/approve-schedule:
    post:
      tags:
        - Smart Scheduler
      summary: Approve schedule
      parameters:
        - $ref: '#/components/parameters/SchedulerId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                approvedBy:
                  type: string
                comments:
                  type: string
      responses:
        '200':
          description: Schedule approved
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SmartScheduler'

  /api/scheduler/{id}/activate-schedule:
    post:
      tags:
        - Smart Scheduler
      summary: Activate schedule
      parameters:
        - $ref: '#/components/parameters/SchedulerId'
      responses:
        '200':
          description: Schedule activated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/SmartScheduler'

  /api/scheduler/{id}/analytics:
    get:
      tags:
        - Smart Scheduler
      summary: Get schedule analytics
      parameters:
        - $ref: '#/components/parameters/SchedulerId'
      responses:
        '200':
          description: Schedule analytics
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      schedulingEfficiency:
                        type: number
                      resourceUtilization:
                        type: number
                      recommendations:
                        type: array
                        items:
                          type: string
```

---

## نقاط مهمة:

### Authentication

جميع الطلبات تتطلب رمز Bearer في الرأس:

```
Authorization: Bearer {token}
```

### Error Handling

الأخطاء يتم إرجاعها بالصيغة:

```json
{
  "success": false,
  "message": "وصف الخطأ",
  "error": "نوع الخطأ",
  "details": ["تفاصيل إضافية"]
}
```

### Success Response

الاستجابات الناجحة بالصيغة:

```json
{
  "success": true,
  "data": {
    /* البيانات */
  }
}
```

---

**آخر تحديث: 22 يناير 2026** **الإصدار: 1.0.0**
