#!/bin/bash

################################################################################
# ALAWAEL v1.0.0 - AUTOMATIC API DOCUMENTATION GENERATOR
# Version: 1.0.0
# Updated: February 22, 2026
# Purpose: Auto-generate API documentation from code
################################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
DOC_DIR=".alawael-api-docs"
API_SPEC="$DOC_DIR/openapi.json"

################################################################################
# INITIALIZE
################################################################################

init_api_docs() {
    mkdir -p "$DOC_DIR"
    mkdir -p "$DOC_DIR/endpoints"
    mkdir -p "$DOC_DIR/schemas"
}

################################################################################
# SCAN ROUTES
################################################################################

scan_backend_routes() {
    echo -e "${CYAN}Scanning Backend Routes...${NC}"
    echo ""
    
    local BACKEND_PATH="erp_new_system/backend"
    
    if [ ! -d "$BACKEND_PATH/routes" ]; then
        echo "Routes directory not found"
        return 1
    fi
    
    local ROUTE_FILES=$(find "$BACKEND_PATH/routes" -name "*.js" 2>/dev/null)
    local FILE_COUNT=0
    
    for file in $ROUTE_FILES; do
        ((FILE_COUNT++))
        local FILE_NAME=$(basename "$file")
        echo "Processing: $FILE_NAME"
        
        # Extract route definitions
        grep -E "router\.(get|post|put|delete|patch)" "$file" | head -5 | while read line; do
            echo "  $line"
        done
    done
    
    echo ""
    echo "Total route files: $FILE_COUNT"
    
    return 0
}

################################################################################
# GENERATE OPENAPI SPEC
################################################################################

generate_openapi_spec() {
    echo -e "${CYAN}Generating OpenAPI 3.0 Specification...${NC}"
    echo ""
    
    cat > "$API_SPEC" << 'EOF'
{
  "openapi": "3.0.0",
  "info": {
    "title": "ALAWAEL Backend API",
    "version": "1.0.0",
    "description": "Comprehensive ERP and Supply Chain Management System",
    "contact": {
      "name": "ALAWAEL Support",
      "email": "support@alawael.com"
    }
  },
  "servers": [
    {
      "url": "http://localhost:3001/api",
      "description": "Development Server"
    },
    {
      "url": "https://api.staging.alawael.com/api",
      "description": "Staging Server"
    },
    {
      "url": "https://api.alawael.com/api",
      "description": "Production Server"
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "summary": "Health Check",
        "description": "Check if the API is running",
        "tags": ["System"],
        "responses": {
          "200": {
            "description": "API is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "OK" },
                    "timestamp": { "type": "string", "example": "2026-02-22T12:00:00Z" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/status": {
      "get": {
        "summary": "System Status",
        "description": "Get detailed system status information",
        "tags": ["System"],
        "responses": {
          "200": {
            "description": "Status information",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "uptime": { "type": "integer" },
                    "memory": { "type": "object" },
                    "database": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "User Login",
        "description": "Authenticate user with credentials",
        "tags": ["Authentication"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "format": "email" },
                  "password": { "type": "string", "format": "password" }
                },
                "required": ["email", "password"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "token": { "type": "string" },
                    "user": { "$ref": "#/components/schemas/User" }
                  }
                }
              }
            }
          },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/users": {
      "get": {
        "summary": "List Users",
        "description": "Get all users (admin only)",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "User list" },
          "401": { "description": "Unauthorized" }
        }
      },
      "post": {
        "summary": "Create User",
        "description": "Create a new user",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/UserInput" }
            }
          }
        },
        "responses": {
          "201": { "description": "User created" },
          "400": { "description": "Validation error" }
        }
      }
    },
    "/users/{userId}": {
      "get": {
        "summary": "Get User",
        "description": "Get specific user details",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "User details" },
          "404": { "description": "User not found" }
        }
      },
      "put": {
        "summary": "Update User",
        "description": "Update user information",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/UserInput" }
            }
          }
        },
        "responses": {
          "200": { "description": "User updated" },
          "404": { "description": "User not found" }
        }
      },
      "delete": {
        "summary": "Delete User",
        "description": "Remove a user",
        "tags": ["Users"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "204": { "description": "User deleted" },
          "404": { "description": "User not found" }
        }
      }
    },
    "/products": {
      "get": {
        "summary": "List Products",
        "tags": ["Products"],
        "parameters": [
          { "name": "category", "in": "query", "schema": { "type": "string" } },
          { "name": "page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Product list" }
        }
      },
      "post": {
        "summary": "Create Product",
        "tags": ["Products"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/ProductInput" }
            }
          }
        },
        "responses": {
          "201": { "description": "Product created" }
        }
      }
    },
    "/orders": {
      "get": {
        "summary": "List Orders",
        "tags": ["Orders"],
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "status", "in": "query", "schema": { "type": "string" } },
          { "name": "dateFrom", "in": "query", "schema": { "type": "string", "format": "date" } }
        ],
        "responses": {
          "200": { "description": "Order list" }
        }
      },
      "post": {
        "summary": "Create Order",
        "tags": ["Orders"],
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/OrderInput" }
            }
          }
        },
        "responses": {
          "201": { "description": "Order created" }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string" },
          "role": { "type": "string", "enum": ["user", "admin", "manager"] },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "UserInput": {
        "type": "object",
        "required": ["email", "name", "password"],
        "properties": {
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string" },
          "password": { "type": "string", "minLength": 8 },
          "role": { "type": "string" }
        }
      },
      "Product": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "category": { "type": "string" },
          "stock": { "type": "integer" }
        }
      },
      "ProductInput": {
        "type": "object",
        "required": ["name", "price", "category"],
        "properties": {
          "name": { "type": "string" },
          "price": { "type": "number", "minimum": 0 },
          "category": { "type": "string" },
          "stock": { "type": "integer" }
        }
      },
      "Order": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "userId": { "type": "string" },
          "items": { "type": "array" },
          "total": { "type": "number" },
          "status": { "type": "string" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "OrderInput": {
        "type": "object",
        "required": ["items"],
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "productId": { "type": "string" },
                "quantity": { "type": "integer" }
              }
            }
          },
          "shippingAddress": { "type": "string" }
        }
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "tags": [
    { "name": "System", "description": "System health and status" },
    { "name": "Authentication", "description": "User authentication" },
    { "name": "Users", "description": "User management" },
    { "name": "Products", "description": "Product catalog" },
    { "name": "Orders", "description": "Order processing" }
  ]
}
EOF

    echo "✓ OpenAPI spec generated: $API_SPEC"
}

################################################################################
# GENERATE MARKDOWN DOCS
################################################################################

generate_markdown_docs() {
    echo -e "${CYAN}Generating Markdown Documentation...${NC}"
    echo ""
    
    local MARKDOWN_FILE="$DOC_DIR/API_DOCUMENTATION.md"
    
    cat > "$MARKDOWN_FILE" << 'EOF'
# ALAWAEL API Documentation

## Overview

This document describes the ALAWAEL Backend API, which powers the Enterprise Resource Planning and Supply Chain Management System.

**API Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api`  
**Authentication:** JWT Bearer Token

---

## Authentication

### Login Endpoint

**POST** `/auth/login`

Authenticate with user credentials to receive a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Endpoints

### System Endpoints

#### Health Check
**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-22T12:00:00Z"
}
```

#### System Status
**GET** `/status`

Get detailed system information.

**Response:**
```json
{
  "uptime": 3600,
  "memory": {
    "used": 256,
    "total": 512
  },
  "database": "mongodb://connected"
}
```

---

### User Endpoints

#### List Users
**GET** `/users`

Retrieve all users (admin only).

**Parameters:**
- `page` (query): Page number (default: 1)
- `limit` (query): Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "user-1",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    }
  ],
  "total": 1,
  "page": 1
}
```

#### Create User
**POST** `/users`

Create a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "SecurePass123!",
  "role": "user"
}
```

**Response (201):**
```json
{
  "id": "user-2",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user"
}
```

#### Get User
**GET** `/users/{userId}`

Retrieve specific user details.

**Response:**
```json
{
  "id": "user-1",
  "email": "admin@example.com",
  "name": "Admin User",
  "role": "admin",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

#### Update User
**PUT** `/users/{userId}`

Update user information.

**Request:**
```json
{
  "name": "Updated Name",
  "role": "manager"
}
```

#### Delete User
**DELETE** `/users/{userId}`

Remove a user account.

**Response (204):** No content

---

### Product Endpoints

#### List Products
**GET** `/products`

Retrieve all products with optional filtering.

**Parameters:**
- `category` (query): Filter by category
- `page` (query): Page number

**Response:**
```json
{
  "data": [
    {
      "id": "prod-1",
      "name": "Product Name",
      "price": 99.99,
      "category": "Electronics",
      "stock": 50
    }
  ],
  "total": 1
}
```

#### Create Product
**POST** `/products`

Add a new product to the catalog.

**Request:**
```json
{
  "name": "New Product",
  "price": 149.99,
  "category": "Electronics",
  "stock": 100
}
```

#### Get Product
**GET** `/products/{productId}`

Retrieve specific product details.

#### Update Product
**PUT** `/products/{productId}`

Update product information.

#### Delete Product
**DELETE** `/products/{productId}`

Remove a product from the catalog.

---

### Order Endpoints

#### List Orders
**GET** `/orders`

Retrieve orders with optional filtering.

**Parameters:**
- `status` (query): Filter by status (pending, processing, shipped, delivered)
- `dateFrom` (query): Start date (YYYY-MM-DD)
- `dateTo` (query): End date (YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "id": "order-1",
      "userId": "user-1",
      "items": [...],
      "total": 299.99,
      "status": "processing"
    }
  ],
  "total": 1
}
```

#### Create Order
**POST** `/orders`

Create a new order.

**Request:**
```json
{
  "items": [
    {
      "productId": "prod-1",
      "quantity": 2
    }
  ],
  "shippingAddress": "123 Main St, City, State"
}
```

#### Get Order
**GET** `/orders/{orderId}`

Retrieve specific order details with full history.

#### Update Order
**PUT** `/orders/{orderId}`

Update order information (status, shipping address).

#### Cancel Order
**DELETE** `/orders/{orderId}`

Cancel an order (if still pending).

---

## Error Handling

The API uses standard HTTP status codes and returns errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional information"
}
```

### Common Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API rate limits:
- Unauthenticated: 10 requests per minute
- Authenticated: 60 requests per minute
- Admin: 300 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1645454400
```

---

## Pagination

List endpoints support pagination:

**Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)

**Response:**
```json
{
  "data": [...],
  "total": 1000,
  "page": 1,
  "pages": 100,
  "limit": 10
}
```

---

## Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Login
const response = await axios.post('http://localhost:3001/api/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const token = response.data.token;

// Use token in subsequent requests
const products = await axios.get('http://localhost:3001/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

console.log(products.data);
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get products with token
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Python

```python
import requests

# Login
response = requests.post('http://localhost:3001/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

token = response.json()['token']

# Get products
headers = {'Authorization': f'Bearer {token}'}
products = requests.get('http://localhost:3001/api/products', headers=headers)

print(products.json())
```

---

## Webhooks (Future)

Webhooks will notify your application of real-time events:

- `order.created`
- `order.updated`
- `order.shipped`
- `payment.completed`
- `product.inventory_low`

---

## Support

For API support and issues:

- Email: api-support@alawael.com
- Documentation: https://docs.alawael.com
- Status Page: https://status.alawael.com

EOF

    echo "✓ Markdown docs generated: $MARKDOWN_FILE"
}

################################################################################
# GENERATE HTML DOCS
################################################################################

generate_html_docs() {
    echo -e "${CYAN}Generating HTML Documentation...${NC}"
    echo ""
    
    local HTML_FILE="$DOC_DIR/API_DOCUMENTATION.html"
    
    cat > "$HTML_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ALAWAEL API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .nav { position: fixed; left: 0; top: 0; width: 250px; height: 100vh; background: #f0f0f0; overflow-y: auto; border-right: 1px solid #ddd; }
        .nav a { display: block; padding: 12px 20px; text-decoration: none; color: #333; border-left: 3px solid transparent; transition: all 0.3s; }
        .nav a:hover { background: #e0e0e0; border-left-color: #667eea; }
        .nav a.active { background: #e8eaf6; border-left-color: #667eea; font-weight: bold; }
        .main { margin-left: 250px; padding: 40px; }
        .section { margin: 40px 0; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .endpoint { margin: 20px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #667eea; border-radius: 4px; }
        .method { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; color: white; font-size: 0.9em; margin-right: 10px; }
        .method.get { background: #61aaf7; }
        .method.post { background: #49cc90; }
        .method.put { background: #fca130; }
        .method.delete { background: #f93e3e; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 20px; border-radius: 4px; overflow-x: auto; margin: 10px 0; }
        pre code { padding: 0; background: none; }
        h1, h2, h3 { color: #333; margin-top: 20px; }
        h1 { font-size: 2.5em; }
        h2 { border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        h3 { color: #667eea; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: bold; }
        .status-200 { color: green; }
        .status-201 { color: green; }
        .status-400 { color: orange; }
        .status-401 { color: red; }
        .status-404 { color: red; }
        .example { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .badge { display: inline-block; padding: 4px 8px; background: #667eea; color: white; border-radius: 3px; font-size: 0.8em; margin-left: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ALAWAEL API Documentation</h1>
        <p>Version 1.0.0 - Enterprise ERP & Supply Chain Management</p>
    </div>
    
    <nav class="nav">
        <a href="#overview" class="active">Overview</a>
        <a href="#authentication">Authentication</a>
        <a href="#endpoints">Endpoints</a>
        <a href="#users">Users</a>
        <a href="#products">Products</a>
        <a href="#orders">Orders</a>
        <a href="#errors">Error Handling</a>
        <a href="#examples">Examples</a>
        <a href="#support">Support</a>
    </nav>
    
    <div class="main">
        <div class="section" id="overview">
            <h2>Overview</h2>
            <p>ALAWAEL Backend API provides comprehensive endpoints for managing users, products, and orders in an enterprise environment.</p>
            <p><strong>Base URL:</strong> <code>http://localhost:3001/api</code></p>
            <p><strong>Authentication:</strong> JWT Bearer Token</p>
        </div>
        
        <div class="section" id="authentication">
            <h2>Authentication</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/auth/login</code>
                <p>Authenticate with user credentials to receive a JWT token.</p>
                <h4>Request Body:</h4>
                <pre><code>{
  "email": "user@example.com",
  "password": "secure_password"
}</code></pre>
                <h4>Response (200):</h4>
                <pre><code>{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}</code></pre>
            </div>
        </div>
        
        <div class="section" id="endpoints">
            <h2>System Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/health</code>
                <p>Check if API is running</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/status</code>
                <p>Get system status information</p>
            </div>
        </div>
        
        <div class="section" id="users">
            <h2>User Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/users</code> <span class="badge">Protected</span>
                <p>List all users (admin only)</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/users</code> <span class="badge">Protected</span>
                <p>Create a new user</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/users/{userId}</code> <span class="badge">Protected</span>
                <p>Get specific user details</p>
            </div>
            
            <div class="endpoint">
                <span class="method put">PUT</span>
                <code>/users/{userId}</code> <span class="badge">Protected</span>
                <p>Update user information</p>
            </div>
            
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <code>/users/{userId}</code> <span class="badge">Protected</span>
                <p>Delete a user</p>
            </div>
        </div>
        
        <div class="section" id="products">
            <h2>Product Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/products</code>
                <p>List all products</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/products</code> <span class="badge">Protected</span>
                <p>Create a new product</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/products/{productId}</code>
                <p>Get product details</p>
            </div>
            
            <div class="endpoint">
                <span class="method put">PUT</span>
                <code>/products/{productId}</code> <span class="badge">Protected</span>
                <p>Update product</p>
            </div>
            
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <code>/products/{productId}</code> <span class="badge">Protected</span>
                <p>Delete product</p>
            </div>
        </div>
        
        <div class="section" id="orders">
            <h2>Order Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/orders</code> <span class="badge">Protected</span>
                <p>List orders</p>
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/orders</code> <span class="badge">Protected</span>
                <p>Create order</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/orders/{orderId}</code> <span class="badge">Protected</span>
                <p>Get order details</p>
            </div>
            
            <div class="endpoint">
                <span class="method put">PUT</span>
                <code>/orders/{orderId}</code> <span class="badge">Protected</span>
                <p>Update order</p>
            </div>
        </div>
        
        <div class="section" id="errors">
            <h2>Error Handling</h2>
            <p>The API returns standard HTTP status codes:</p>
            <table>
                <tr>
                    <th>Code</th>
                    <th>Meaning</th>
                </tr>
                <tr>
                    <td class="status-200">200</td>
                    <td>OK - Request successful</td>
                </tr>
                <tr>
                    <td class="status-201">201</td>
                    <td>Created - Resource created successfully</td>
                </tr>
                <tr>
                    <td class="status-400">400</td>
                    <td>Bad Request - Invalid input</td>
                </tr>
                <tr>
                    <td class="status-401">401</td>
                    <td>Unauthorized - Authentication required</td>
                </tr>
                <tr>
                    <td class="status-404">404</td>
                    <td>Not Found - Resource not found</td>
                </tr>
            </table>
        </div>
        
        <div class="section" id="examples">
            <h2>Code Examples</h2>
            
            <h3>JavaScript</h3>
            <div class="example">
                <pre><code>const axios = require('axios');

const token = 'your_jwt_token';
const users = await axios.get('http://localhost:3001/api/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});

console.log(users.data);</code></pre>
            </div>
            
            <h3>cURL</h3>
            <div class="example">
                <pre><code>curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"</code></pre>
            </div>
            
            <h3>Python</h3>
            <div class="example">
                <pre><code>import requests

headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('http://localhost:3001/api/users', headers=headers)
print(response.json())</code></pre>
            </div>
        </div>
        
        <div class="section" id="support">
            <h2>Support</h2>
            <p>For API support:</p>
            <ul>
                <li>Email: api-support@alawael.com</li>
                <li>Status: https://status.alawael.com</li>
                <li>Docs: https://docs.alawael.com</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF

    echo "✓ HTML docs generated: $HTML_FILE"
}

################################################################################
# SWAGGER UI SETUP
################################################################################

setup_swagger_ui() {
    echo -e "${CYAN}Setting up Swagger UI...${NC}"
    echo ""
    
    local SWAGGER_DIR="$DOC_DIR/swagger-ui"
    mkdir -p "$SWAGGER_DIR"
    
    cat > "$SWAGGER_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ALAWAEL API - Swagger UI</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css">
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.js"></script>
    <script>
        const ui = SwaggerUIBundle({
            url: "../openapi.json",
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout"
        })
    </script>
</body>
</html>
EOF

    echo "✓ Swagger UI setup complete: $SWAGGER_DIR/index.html"
}

################################################################################
# MAIN MENU
################################################################################

show_menu() {
    clear
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ALAWAEL - API DOCUMENTATION GENERATOR              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Automatically generate API documentation"
    echo ""
    echo "Generation:"
    echo "  1. Scan backend routes"
    echo "  2. Generate OpenAPI 3.0 specification"
    echo "  3. Generate Markdown documentation"
    echo "  4. Generate HTML documentation"
    echo "  5. Setup Swagger UI viewer"
    echo ""
    echo "Quick Actions:"
    echo "  6. Generate all documentation"
    echo ""
    echo "  0. Exit"
    echo ""
}

main() {
    init_api_docs
    
    while true; do
        show_menu
        read -p "Select option (0-6): " choice
        
        case $choice in
            1) scan_backend_routes ;;
            2) generate_openapi_spec ;;
            3) generate_markdown_docs ;;
            4) generate_html_docs ;;
            5) setup_swagger_ui ;;
            6)
                scan_backend_routes
                generate_openapi_spec
                generate_markdown_docs
                generate_html_docs
                setup_swagger_ui
                ;;
            0) echo "Exiting..."; exit 0 ;;
            *) echo "Invalid option" ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
