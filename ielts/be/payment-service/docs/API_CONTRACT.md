# API Contract — Payment Service

Base path: /
Auth type: Bearer JWT
Content-Type: application/json

## 1. Health
### GET /
Response 200
```json
{ "status": "OK", "service": "payment-service" }
```

### GET /health
Response 200
```json
{ "status": "OK", "service": "payment-service" }
```

## 2. Create Payment
### POST /create
Auth required: Yes

Request body
```json
{
  "planId": "PLUS",
  "amount": 199000
}
```

Success 200
```json
{
  "success": true,
  "qrUrl": "https://img.vietqr.io/image/VCB-1234567890-compact2.png?amount=199000&addInfo=VIP453129&accountName=TEST_ACCOUNT",
  "orderId": "VIP453129",
  "amount": 199000
}
```

Error 400
```json
{ "message": "planId and amount are required." }
```

Error 400
```json
{ "message": "amount must be a positive number." }
```

Error 401
```json
{ "message": "Unauthorized" }
```

Error 500
```json
{
  "success": false,
  "message": "Missing VietQR configuration in environment variables."
}
```

### POST /create-vietqr
Alias of POST /create with identical contract.

## 3. My Pending Transaction
### GET /transactions/my-pending
Auth required: Yes

Success 200 (has pending)
```json
{
  "success": true,
  "data": {
    "_id": "66f2c81dcf7612b7739a8201",
    "orderId": "VIP453129",
    "userId": "66f2c7d8cf7612b7739a81fd",
    "planId": "PLUS",
    "amount": 199000,
    "status": "Pending"
  }
}
```

Success 200 (no pending)
```json
{ "success": true, "data": null }
```

## 4. List Transactions
### GET /transactions
Auth required: Yes

Success 200
```json
{
  "success": true,
  "data": [
    {
      "_id": "66f2c81dcf7612b7739a8201",
      "orderId": "VIP453129",
      "userId": {
        "name": "Student",
        "fullName": "Student Name",
        "email": "student@example.com"
      },
      "planId": "PRO",
      "amount": 399000,
      "status": "Success",
      "createdAt": "2026-03-09T10:12:31.222Z"
    }
  ]
}
```

Fallback behavior: if auth-service user enrichment fails, endpoint still returns 200 with minimal userId object.

## 5. Approve Transaction
### PUT /transactions/:id/approve
Auth required: Yes

Success 200
```json
{
  "success": true,
  "message": "Transaction approved and user upgraded successfully.",
  "data": {
    "_id": "66f2c81dcf7612b7739a8201",
    "status": "Success"
  }
}
```

Error 404
```json
{ "success": false, "message": "Transaction not found." }
```

Error 400
```json
{ "success": false, "message": "Transaction already processed. Only pending transactions can be approved." }
```

Error 400
```json
{ "success": false, "message": "Unsupported planId \"UNKNOWN\" for upgrade." }
```

Error 502
```json
{
  "success": false,
  "message": "Transaction found but failed to upgrade user subscription. Please retry.",
  "error": "Auth service error message"
}
```

## 6. Reject Transaction
### PUT /transactions/:id/reject
Auth required: Yes

Success 200
```json
{
  "success": true,
  "message": "Transaction rejected successfully.",
  "data": {
    "_id": "66f2c81dcf7612b7739a8201",
    "status": "Failed"
  }
}
```

Error 404
```json
{ "success": false, "message": "Transaction not found." }
```

Error 400
```json
{ "success": false, "message": "Transaction already processed. Only pending transactions can be rejected." }
```

## 7. Internal Calls Performed by Service
- PATCH {AUTH_SERVICE_INTERNAL_URL}/api/auth/internal/users/:userId/plan
- POST {BILLING_SERVICE_INTERNAL_URL}/api/billing/internal/subscriptions/activate

These calls are outbound dependencies, not public endpoints in this service.
