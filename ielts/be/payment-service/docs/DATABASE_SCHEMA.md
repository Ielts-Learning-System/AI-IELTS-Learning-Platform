# Database Schema — Payment Service

## 1. Collection: transactions
Collection name: transactions

### Fields
- orderId: String, required, unique
- userId: ObjectId, required, ref User
- planId: String, required
- amount: Number, required
- status: String, enum [Pending, Success, Failed], default Pending
- transId: String, default null
- createdAt: Date (auto)
- updatedAt: Date (auto)

## 2. JSON Example
```json
{
  "_id": "66f2c81dcf7612b7739a8201",
  "orderId": "VIP453129",
  "userId": "66f2c7d8cf7612b7739a81fd",
  "planId": "VIP_6_MONTH",
  "amount": 299000,
  "status": "Pending",
  "transId": null,
  "createdAt": "2026-03-09T10:12:31.222Z",
  "updatedAt": "2026-03-09T10:12:31.222Z"
}
```

## 3. Indexes and Constraints
- Unique index on orderId.
- Implicit index on _id.

## 4. Status Model
- Pending: newly created and waiting admin decision.
- Success: approved and plan upgraded in auth-service.
- Failed: rejected by admin.

## 5. Plan Mapping Model
Controller-level PLAN_UPGRADE_CONFIG drives plan normalization:
- PLUS -> { plan: PLUS, durationDays: 30 }
- VIP_1_MONTH -> { plan: PLUS, durationDays: 30 }
- VIP_6_MONTH -> { plan: PLUS, durationDays: 180 }
- PRO -> { plan: PRO, durationDays: 365 }
- VIP_1_YEAR -> { plan: PRO, durationDays: 365 }

This mapping is not persisted in collection, but controls outbound auth-service payload.

## 6. Data Lifecycle
1. Create payment inserts Pending transaction.
2. Approve updates transaction to Success.
3. Reject updates transaction to Failed.
4. No hard delete policy currently implemented.

## 7. Integrity Notes
- orderId uniqueness prevents duplicate payment references.
- State transition validation is enforced at controller level.
- Unsupported planId cannot be approved.
