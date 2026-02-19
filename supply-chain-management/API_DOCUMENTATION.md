# Supply Chain Management API - Complete Documentation

## Overview

Production-grade Supply Chain Management System with comprehensive order,
product, supplier, inventory, and shipment management.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require Bearer token
in Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```

Response (201):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

---

### Login User

**POST** `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

Response (200):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Products Endpoints

### Get All Products

**GET** `/products`

Query Parameters:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `sort` (optional): Sort field (default: -createdAt)

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Product Name",
    "sku": "SKU001",
    "description": "Product description",
    "price": 99.99,
    "category": "Electronics",
    "stock": 100,
    "createdAt": "2024-02-08T10:00:00Z"
  }
]
```

---

### Get Product by ID

**GET** `/products/:id`

Response (200):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Product Name",
  "sku": "SKU001",
  "price": 99.99,
  "stock": 100
}
```

Response (404): Product not found

---

### Create Product

**POST** `/products`

Request:

```json
{
  "name": "New Product",
  "sku": "SKU002",
  "description": "Product description",
  "price": 149.99,
  "category": "Electronics",
  "stock": 50,
  "image": "https://example.com/image.jpg"
}
```

Response (201):

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "New Product",
  "sku": "SKU002",
  "price": 149.99,
  "category": "Electronics",
  "stock": 50,
  "createdAt": "2024-02-08T10:15:00Z"
}
```

Validation Errors (400):

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name is required",
      "value": ""
    }
  ]
}
```

---

### Update Product

**PUT** `/products/:id`

Request:

```json
{
  "name": "Updated Product Name",
  "price": 129.99,
  "stock": 75
}
```

Response (200):

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Updated Product Name",
  "price": 129.99,
  "stock": 75
}
```

---

### Delete Product

**DELETE** `/products/:id`

Response (200):

```json
{
  "message": "Product deleted successfully",
  "deletedId": "507f1f77bcf86cd799439012"
}
```

---

## Suppliers Endpoints

### Get All Suppliers

**GET** `/suppliers`

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439020",
    "name": "Supplier Name",
    "email": "supplier@example.com",
    "phone": "+1234567890",
    "address": "123 Business Ave",
    "city": "New York",
    "country": "USA",
    "rating": 4.5,
    "createdAt": "2024-02-08T10:00:00Z"
  }
]
```

---

### Create Supplier

**POST** `/suppliers`

Request:

```json
{
  "name": "New Supplier Inc",
  "email": "contact@supplier.com",
  "phone": "+1234567890",
  "address": "456 Industrial Blvd",
  "city": "Los Angeles",
  "country": "USA",
  "website": "https://supplier.com"
}
```

Response (201):

```json
{
  "_id": "507f1f77bcf86cd799439021",
  "name": "New Supplier Inc",
  "email": "contact@supplier.com",
  "rating": 0,
  "createdAt": "2024-02-08T10:20:00Z"
}
```

---

### Update Supplier

**PUT** `/suppliers/:id`

Request:

```json
{
  "rating": 4.8,
  "phone": "+9876543210"
}
```

Response (200): Updated supplier object

---

### Delete Supplier

**DELETE** `/suppliers/:id`

Response (200):

```json
{
  "message": "Supplier deleted successfully"
}
```

---

## Orders Endpoints

### Get All Orders

**GET** `/orders`

Query Parameters:

- `status` (optional): Filter by status (pending, approved, shipped, delivered,
  cancelled)
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439030",
    "supplier": {
      "_id": "507f1f77bcf86cd799439020",
      "name": "Supplier Name"
    },
    "products": [
      {
        "product": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Product Name"
        },
        "quantity": 10,
        "price": 99.99
      }
    ],
    "status": "pending",
    "orderDate": "2024-02-08T11:00:00Z",
    "notes": "Urgent delivery needed"
  }
]
```

---

### Create Order

**POST** `/orders`

Request:

```json
{
  "supplier": "507f1f77bcf86cd799439020",
  "products": [
    {
      "product": "507f1f77bcf86cd799439012",
      "quantity": 10,
      "price": 99.99
    },
    {
      "product": "507f1f77bcf86cd799439013",
      "quantity": 5,
      "price": 149.99
    }
  ],
  "notes": "Special handling required"
}
```

Response (201):

```json
{
  "_id": "507f1f77bcf86cd799439031",
  "supplier": "507f1f77bcf86cd799439020",
  "products": [...],
  "status": "pending",
  "orderDate": "2024-02-08T11:00:00Z"
}
```

---

### Update Order Status

**PUT** `/orders/:id`

Request:

```json
{
  "status": "approved",
  "deliveryDate": "2024-02-15T00:00:00Z"
}
```

Response (200): Updated order object

Allowed Status Values:

- `pending` (default)
- `approved`
- `shipped`
- `delivered`
- `cancelled`

---

### Delete Order

**DELETE** `/orders/:id`

Response (200):

```json
{
  "message": "Order deleted successfully"
}
```

---

## Inventory Endpoints

### Get Inventory

**GET** `/inventory`

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439040",
    "product": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Product Name",
      "sku": "SKU001"
    },
    "quantity": 100,
    "warehouseLocation": "A-12-45",
    "lastRestocked": "2024-02-08T09:00:00Z"
  }
]
```

---

### Update Inventory

**PUT** `/inventory/:id`

Request:

```json
{
  "quantity": 150,
  "warehouseLocation": "B-5-10"
}
```

Response (200): Updated inventory object

---

## Shipments Endpoints

### Get All Shipments

**GET** `/shipments`

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439050",
    "order": "507f1f77bcf86cd799439031",
    "carrier": "FedEx",
    "trackingNumber": "794618206373",
    "status": "in_transit",
    "estimatedDelivery": "2024-02-15T00:00:00Z",
    "address": "123 Delivery St",
    "sentAt": "2024-02-08T14:00:00Z"
  }
]
```

---

### Create Shipment

**POST** `/shipments`

Request:

```json
{
  "order": "507f1f77bcf86cd799439031",
  "carrier": "DHL",
  "trackingNumber": "1234567890",
  "estimatedDelivery": "2024-02-16T00:00:00Z",
  "address": "456 Destination Ave"
}
```

Response (201): Created shipment object

---

### Update Shipment

**PUT** `/shipments/:id`

Request:

```json
{
  "status": "delivered",
  "deliveredAt": "2024-02-15T10:30:00Z"
}
```

Response (200): Updated shipment object

---

## Audit Log Endpoints

### Get Audit Logs

**GET** `/auditlog`

Query Parameters:

- `action` (optional): Filter by action (create, update, delete)
- `entity` (optional): Filter by entity type
- `userId` (optional): Filter by user ID
- `startDate` (optional): From date
- `endDate` (optional): To date

Response (200):

```json
[
  {
    "_id": "507f1f77bcf86cd799439060",
    "user": "507f1f77bcf86cd799439011",
    "action": "create",
    "entity": "Order",
    "entityId": "507f1f77bcf86cd799439031",
    "details": {
      "before": null,
      "after": {...}
    },
    "timestamp": "2024-02-08T11:00:00Z",
    "ipAddress": "192.168.1.1"
  }
]
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [...]
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "code": "INVALID_TOKEN",
  "message": "Invalid authentication token"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "Resource not found"
}
```

### 409 Conflict

```json
{
  "status": "error",
  "code": "DUPLICATE_KEY",
  "message": "A document with this SKU already exists",
  "field": "sku"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "code": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Exceeding limits**: Returns 429 Too Many Requests

---

## Best Practices

1. **Authentication**: Always include valid Bearer token in Authorization header
2. **Pagination**: Use page and limit parameters for large datasets
3. **Error Handling**: Check response status and handle errors appropriately
4. **Timestamps**: All timestamps are in ISO 8601 format (UTC)
5. **IDs**: All IDs are MongoDB ObjectIds
6. **Sorting**: Use `-` prefix for descending order (e.g., `-createdAt`)

---

## Status Codes Reference

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 200  | OK - Request successful                        |
| 201  | Created - Resource created successfully        |
| 400  | Bad Request - Invalid data or validation error |
| 401  | Unauthorized - Missing or invalid token        |
| 403  | Forbidden - Insufficient permissions           |
| 404  | Not Found - Resource not found                 |
| 409  | Conflict - Duplicate key or resource exists    |
| 429  | Too Many Requests - Rate limit exceeded        |
| 500  | Internal Server Error - Server error           |

---

## Example Usage

### Complete Order Creation Flow

```bash
# 1. Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Supplier"
  }'

# 2. Login and get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# 3. Create product
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <INSERT_TOKEN>" \
  -d '{
    "name": "Widget",
    "sku": "WID001",
    "price": 29.99,
    "category": "Tools",
    "stock": 100
  }'

# 4. Create supplier
curl -X POST http://localhost:4000/api/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <INSERT_TOKEN>" \
  -d '{
    "name": "Widget Corp",
    "email": "contact@widgetcorp.com",
    "address": "123 Main St",
    "city": "Springfield",
    "country": "USA"
  }'

# 5. Create order
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <INSERT_TOKEN>" \
  -d '{
    "supplier": "<SUPPLIER_ID>",
    "products": [{
      "product": "<PRODUCT_ID>",
      "quantity": 50,
      "price": 29.99
    }],
    "notes": "Bulk order"
  }'
```

---

## Support

For API support and issues, contact: api-support@supplychain.local
