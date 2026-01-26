# 📚 Student Transportation System - Complete API Reference

## 🌐 Base URL

```
http://127.0.0.1:3004
```

---

## 📋 Table of Contents

1. [System Endpoints](#system-endpoints)
2. [Student Management](#student-management)
3. [Bus Route Management](#bus-route-management)
4. [Driver Management](#driver-management)
5. [Vehicle Management](#vehicle-management)
6. [Attendance Tracking](#attendance-tracking)
7. [Payment Management](#payment-management)
8. [Incident Reporting](#incident-reporting)
9. [Notification System](#notification-system)

---

## System Endpoints

### 1. Health Check

**Endpoint:** `GET /transport/health`

**Description:** Check system status and uptime

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/health
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "🚌 Transportation System Health Check",
  "data": {
    "status": "healthy",
    "service": "Student Transportation System v1.0",
    "uptime": 145.236,
    "timestamp": "2026-01-20T04:00:00.000Z",
    "port": 3004
  }
}
```

---

### 2. System Statistics

**Endpoint:** `GET /transport/stats`

**Description:** Get overall system statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "System Statistics",
  "data": {
    "totalStudents": 5,
    "totalRoutes": 3,
    "totalDrivers": 2,
    "totalVehicles": 3,
    "totalPayments": 10,
    "totalIncidents": 2,
    "totalAttendance": 25
  }
}
```

---

### 3. Dashboard Data

**Endpoint:** `GET /transport/dashboard`

**Description:** Get comprehensive dashboard data

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/dashboard
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Dashboard Data",
  "data": {
    "overview": {
      "totalStudents": 5,
      "totalRoutes": 3,
      "activeRoutes": 2,
      "activeDrivers": 2
    },
    "payments": {
      "totalPayments": 10,
      "pendingPayments": 3,
      "completedPayments": 7
    },
    "incidents": {
      "openIncidents": 1,
      "resolvedIncidents": 1
    }
  }
}
```

---

## Student Management

### 1. Get All Students

**Endpoint:** `GET /transport/students`

**Description:** Retrieve all students

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/students
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Students",
  "data": [
    {
      "id": "STU-1",
      "firstName": "Ahmed",
      "lastName": "AlOtaibi",
      "email": "ahmed@school.edu",
      "phone": "0555555555",
      "studentID": "STU-001",
      "grade": "10",
      "schoolName": "King Fahd School",
      "status": "active",
      "paymentStatus": "pending",
      "createdAt": "2026-01-20T03:59:47.593Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Student Statistics

**Endpoint:** `GET /transport/students/stats`

**Description:** Get student-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/students/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Student Statistics",
  "data": {
    "totalStudents": 5,
    "activeStudents": 4,
    "inactiveStudents": 1,
    "paymentPending": 2,
    "paymentPaid": 3
  }
}
```

---

### 3. Create Student

**Endpoint:** `POST /transport/students`

**Description:** Register a new student

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/students \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sara",
    "lastName": "AlSaudi",
    "email": "sara@school.edu",
    "phone": "0566666666",
    "studentID": "STU-002",
    "grade": "11",
    "schoolName": "King Abdulaziz School",
    "parentName": "Mohammad AlSaudi",
    "parentPhone": "0544444444"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "STU-2",
    "firstName": "Sara",
    "lastName": "AlSaudi",
    "email": "sara@school.edu",
    "phone": "0566666666",
    "studentID": "STU-002",
    "status": "active",
    "paymentStatus": "pending",
    "createdAt": "2026-01-20T04:00:00.000Z"
  }
}
```

---

## Bus Route Management

### 1. Get All Routes

**Endpoint:** `GET /transport/routes`

**Description:** Retrieve all bus routes

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/routes
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Bus Routes",
  "data": [
    {
      "id": "RT-1",
      "routeName": "North District Route",
      "routeNumber": "RT-001",
      "departureTime": "07:00",
      "arrivalTime": "08:30",
      "status": "active",
      "totalStudents": 0,
      "currentLoad": 0
    }
  ],
  "count": 1
}
```

---

### 2. Get Route Statistics

**Endpoint:** `GET /transport/routes/stats`

**Description:** Get route-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/routes/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Route Statistics",
  "data": {
    "totalRoutes": 3,
    "activeRoutes": 2,
    "totalStudents": 15,
    "averageLoad": "5.00"
  }
}
```

---

### 3. Create Route

**Endpoint:** `POST /transport/routes`

**Description:** Create a new bus route

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeName": "East District Route",
    "routeNumber": "RT-002",
    "departureTime": "07:30",
    "arrivalTime": "08:45",
    "busCapacity": 45
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Route created successfully",
  "data": {
    "id": "RT-2",
    "routeName": "East District Route",
    "routeNumber": "RT-002",
    "departureTime": "07:30",
    "arrivalTime": "08:45",
    "status": "active",
    "totalStudents": 0,
    "currentLoad": 0
  }
}
```

---

## Driver Management

### 1. Get All Drivers

**Endpoint:** `GET /transport/drivers`

**Description:** Retrieve all drivers

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/drivers
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Drivers",
  "data": [
    {
      "id": "DRV-1",
      "firstName": "Mohammad",
      "lastName": "AlDosari",
      "email": "mohammad@transport.com",
      "phone": "0533333333",
      "driverID": "DRV-001",
      "licenseNumber": "DRV-123456",
      "status": "active",
      "rating": 5,
      "safetyScore": 100,
      "totalTrips": 0,
      "incidents": 0
    }
  ],
  "count": 1
}
```

---

### 2. Get Driver Statistics

**Endpoint:** `GET /transport/drivers/stats`

**Description:** Get driver-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/drivers/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Driver Statistics",
  "data": {
    "totalDrivers": 2,
    "activeDrivers": 2,
    "averageRating": "5.00",
    "averageSafetyScore": 100
  }
}
```

---

### 3. Create Driver

**Endpoint:** `POST /transport/drivers`

**Description:** Register a new driver

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ali",
    "lastName": "AlKhalaqi",
    "email": "ali@transport.com",
    "phone": "0544444444",
    "driverID": "DRV-002",
    "licenseNumber": "DRV-234567",
    "licenseExpiry": "2027-12-31"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Driver created successfully",
  "data": {
    "id": "DRV-2",
    "firstName": "Ali",
    "lastName": "AlKhalaqi",
    "email": "ali@transport.com",
    "phone": "0544444444",
    "driverID": "DRV-002",
    "status": "active",
    "rating": 5,
    "safetyScore": 100
  }
}
```

---

## Vehicle Management

### 1. Get All Vehicles

**Endpoint:** `GET /transport/vehicles`

**Description:** Retrieve all vehicles

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/vehicles
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Vehicles",
  "data": [
    {
      "id": "VEH-1",
      "vehicleName": "Bus-001",
      "registrationNumber": "ABC-1234",
      "vin": "VIN123456789",
      "vehicleType": "bus",
      "make": "Isuzu",
      "model": "Turbo",
      "year": 2022,
      "seatingCapacity": 45,
      "status": "operational"
    }
  ],
  "count": 1
}
```

---

### 2. Get Vehicle Statistics

**Endpoint:** `GET /transport/vehicles/stats`

**Description:** Get vehicle-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/vehicles/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Vehicle Statistics",
  "data": {
    "totalVehicles": 3,
    "operationalVehicles": 3,
    "maintenanceVehicles": 0,
    "totalCapacity": 135
  }
}
```

---

### 3. Create Vehicle

**Endpoint:** `POST /transport/vehicles`

**Description:** Register a new vehicle

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleName": "Bus-002",
    "registrationNumber": "XYZ-5678",
    "vin": "VIN987654321",
    "vehicleType": "bus",
    "make": "Hino",
    "model": "Ranger",
    "year": 2023,
    "seatingCapacity": 50
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": "VEH-2",
    "vehicleName": "Bus-002",
    "registrationNumber": "XYZ-5678",
    "vin": "VIN987654321",
    "vehicleType": "bus",
    "make": "Hino",
    "model": "Ranger",
    "year": 2023,
    "seatingCapacity": 50,
    "status": "operational"
  }
}
```

---

## Attendance Tracking

### 1. Get All Attendance Records

**Endpoint:** `GET /transport/attendance`

**Description:** Retrieve all attendance records

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/attendance
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Attendance Records",
  "data": [
    {
      "id": "ATT-1",
      "student": "STU-001",
      "busRoute": "RT-001",
      "date": "2026-01-20",
      "status": "present",
      "createdAt": "2026-01-20T04:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Attendance Statistics

**Endpoint:** `GET /transport/attendance/stats`

**Description:** Get attendance-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/attendance/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Attendance Statistics",
  "data": {
    "totalRecords": 25,
    "present": 20,
    "absent": 3,
    "late": 2,
    "attendanceRate": "80.00"
  }
}
```

---

### 3. Record Attendance

**Endpoint:** `POST /transport/attendance`

**Description:** Record student attendance

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "student": "STU-002",
    "busRoute": "RT-002",
    "date": "2026-01-20",
    "pickupTime": "07:30",
    "dropoffTime": "15:00",
    "status": "present"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Attendance recorded",
  "data": {
    "id": "ATT-2",
    "student": "STU-002",
    "date": "2026-01-20",
    "pickupTime": "07:30",
    "dropoffTime": "15:00",
    "status": "present"
  }
}
```

---

## Payment Management

### 1. Get All Payments

**Endpoint:** `GET /transport/payments`

**Description:** Retrieve all payments

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/payments
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Payments",
  "data": [
    {
      "id": "PAY-1",
      "paymentNumber": "PAY-1642678800000",
      "student": "STU-001",
      "amount": 500,
      "currency": "SAR",
      "month": "January",
      "year": 2026,
      "status": "pending",
      "createdAt": "2026-01-20T04:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Payment Statistics

**Endpoint:** `GET /transport/payments/stats`

**Description:** Get payment-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/payments/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Payment Statistics",
  "data": {
    "totalPayments": 10,
    "completedPayments": 7,
    "pendingPayments": 3,
    "totalAmount": 5000
  }
}
```

---

### 3. Create Payment

**Endpoint:** `POST /transport/payments`

**Description:** Create a new payment

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/payments \
  -H "Content-Type: application/json" \
  -d '{
    "student": "STU-002",
    "amount": 500,
    "month": "January",
    "year": 2026,
    "paymentMethod": "cash",
    "invoiceDate": "2026-01-20",
    "dueDate": "2026-01-31"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Payment created",
  "data": {
    "id": "PAY-2",
    "paymentNumber": "PAY-1642678800001",
    "student": "STU-002",
    "amount": 500,
    "month": "January",
    "year": 2026,
    "status": "pending"
  }
}
```

---

## Incident Reporting

### 1. Get All Incidents

**Endpoint:** `GET /transport/incidents`

**Description:** Retrieve all incidents

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/incidents
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Incidents",
  "data": [
    {
      "id": "INC-1",
      "incidentNumber": "INC-1642678800000",
      "date": "2026-01-20",
      "type": "behavioral",
      "severity": "low",
      "description": "Student arrived late",
      "status": "open"
    }
  ],
  "count": 1
}
```

---

### 2. Get Incident Statistics

**Endpoint:** `GET /transport/incidents/stats`

**Description:** Get incident-related statistics

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/incidents/stats
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Incident Statistics",
  "data": {
    "totalIncidents": 2,
    "openIncidents": 1,
    "resolvedIncidents": 1
  }
}
```

---

### 3. Report Incident

**Endpoint:** `POST /transport/incidents`

**Description:** Report a new incident

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "accident",
    "severity": "medium",
    "description": "Minor traffic incident",
    "date": "2026-01-20",
    "time": "14:30"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Incident reported",
  "data": {
    "id": "INC-2",
    "incidentNumber": "INC-1642678800001",
    "type": "accident",
    "severity": "medium",
    "description": "Minor traffic incident",
    "status": "open",
    "date": "2026-01-20"
  }
}
```

---

## Notification System

### 1. Get All Notifications

**Endpoint:** `GET /transport/notifications`

**Description:** Retrieve all notifications

**Request:**

```bash
curl -X GET http://127.0.0.1:3004/transport/notifications
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "All Notifications",
  "data": [
    {
      "id": "NOT-1",
      "title": "Pickup Time",
      "message": "Bus arriving in 5 minutes",
      "type": "pickup",
      "status": "unread"
    }
  ],
  "count": 1
}
```

---

### 2. Send Notification

**Endpoint:** `POST /transport/notifications`

**Description:** Send a notification

**Request:**

```bash
curl -X POST http://127.0.0.1:3004/transport/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "STU-001",
    "recipientType": "student",
    "title": "Route Update",
    "message": "Your route has been updated",
    "type": "general",
    "deliveryMethod": ["sms", "email"]
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Notification sent",
  "data": {
    "id": "NOT-2",
    "title": "Route Update",
    "message": "Your route has been updated",
    "type": "general",
    "status": "unread",
    "sentAt": "2026-01-20T04:00:00.000Z"
  }
}
```

---

## Error Responses

### 404 Not Found

```json
{
  "success": false,
  "message": "404 - Route not found",
  "availableRoutes": [
    "/transport/health",
    "/transport/dashboard",
    ...
  ]
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid JSON body",
  "error": "Unexpected token } in JSON at position 50"
}
```

### 500 Server Error

```json
{
  "success": false,
  "message": "Server error",
  "error": "Error details"
}
```

---

## HTTP Status Codes

| Code | Meaning                        |
| ---- | ------------------------------ |
| 200  | OK - Request successful        |
| 201  | Created - Resource created     |
| 400  | Bad Request - Invalid input    |
| 404  | Not Found - Resource not found |
| 500  | Server Error                   |

---

## Response Headers

All responses include:

```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Data Validation

### Required Fields by Endpoint

**Student:**

- firstName, lastName, email, phone, studentID

**Bus Route:**

- routeName, routeNumber, departureTime, arrivalTime

**Driver:**

- firstName, lastName, email, phone, driverID, licenseNumber

**Vehicle:**

- vehicleName, registrationNumber, vin, seatingCapacity

**Attendance:**

- student, busRoute, date, status

**Payment:**

- student, amount, month, year, paymentMethod

**Incident:**

- type, severity, description, date

---

## Performance Notes

- All responses are returned within 100ms
- In-memory storage for fast access
- No database latency
- Suitable for 100+ concurrent users
- Scalable to 1000s with caching

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**API Version:** 1.0.0
