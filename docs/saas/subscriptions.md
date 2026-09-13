# SaaS Subscription & Plan Architecture

**Product**: Hospital Management System (HMS MedCore)  
**Classification**: Commercial SaaS Engine  
**Authoritative Scope**: Tenant Subscriptions, Plan Capabilities, Lifecycle States, Payment Agnosticism  

---

## 1. Architectural Model & Core Entities

The HMS SaaS monetization and tiering engine is organized around three foundational entities:

```text
┌──────────────────────┐
│        Tenant        │ (The Hospital or Clinic Organization)
└──────────┬───────────┘
           │ 1:1
           ▼
┌──────────────────────┐
│     Subscription     │ (The Active Commercial Contract & Lifecycle State)
└──────────┬───────────┘
           │ N:1
           ▼
┌──────────────────────┐
│         Plan         │ (The Feature Set, Limits, & Capability Configuration)
└──────────────────────┘
```

---

## 2. Subscription Lifecycle States

Every tenant's operational status is governed by a state machine that reflects their billing and compliance standing:

```text
               ┌──────────┐
               │  TRIAL   │
               └────┬─────┘
                    │ Upgrade / Payment
                    ▼
 ┌──────────┐   ┌──────────┐   Failed Payment   ┌──────────┐
 │ CANCELLED│◄──┤  ACTIVE  ├───────────────────►│ PAST_DUE │
 └──────────┘   └────┬─────┘                    └────┬─────┘
                     │ Manual / Policy Hold          │ Grace Period Expiry
                     ▼                               ▼
               ┌──────────┐                    ┌──────────┐
               │ SUSPENDED│◄───────────────────┤ EXPIRED  │
               └──────────┘                    └──────────┘
```

### State Definitions

| State | Operational Behavior | Clinical Access | Mutation Allowed |
|---|---|---|---|
| **`TRIAL`** | Full or configured access during evaluation period. | Allowed | Allowed |
| **`ACTIVE`** | Normal operational access with active subscription. | Allowed | Allowed |
| **`PAST_DUE`** | Grace period following payment failure. Warning banner displayed to Hospital Admins. | Allowed | Allowed |
| **`SUSPENDED`** | Operational lockout due to compliance breach or extended non-payment. | Read-Only or Blocked | **Blocked** |
| **`CANCELLED`** | Customer requested termination; active until end of billing cycle. | Allowed until expiry | Allowed |
| **`EXPIRED`** | Trial ended or grace period elapsed without payment. Read-only archive access or locked. | Read-Only | **Blocked** |

---

## 3. SaaS Plan Configuration Model

Plans are dynamic configurations stored in the database (`plans` collection) rather than hardcoded in application logic.

### Conceptual Plan Structure

```json
{
  "_id": "ObjectId",
  "code": "ENTERPRISE",
  "name": "Enterprise Hospital Network",
  "description": "Full-spectrum multispecialty hospital operations",
  "enabledModules": [
    "opd",
    "ipd",
    "emr",
    "laboratory",
    "pharmacy",
    "inventory",
    "billing",
    "reports"
  ],
  "limits": {
    "maxUsers": 100,
    "maxBranches": 5,
    "maxBeds": 250,
    "maxStorageGb": 500
  },
  "capabilities": {
    "aiEnabled": false,
    "advancedAnalytics": true,
    "customTariffs": true,
    "apiAccess": true
  },
  "isActive": true
}
```

> [!IMPORTANT]
> **No Premature Restrictions**:  
> In Phase 1 development, the application code does **not** enforce arbitrary limits (e.g. user seat caps, patient limits). The architecture supports this data model so that limits and feature gates can be evaluated through guards when commercial enforcement is scheduled.

---

## 4. Payment Gateway Agnosticism

### Policy Directives
1. **Zero Hardcoded Gateways**: Neither Razorpay, Stripe, nor local bank APIs are implemented in Phase 1.
2. **Zero Hardcoded Prices**: No currency amounts, monthly rates, or tier prices are embedded in code. Pricing is an operational/business configuration managed via the `plans` database model.
3. **Platform Administrative Management**: In Phase 1 and early staging, subscriptions and tenant activation are managed administratively by Platform Super Admins via the Platform Management Module.
4. **Clean Webhook / Adapter Interface**: When payment integration is scheduled, it will be introduced via an abstract `PaymentGatewayAdapter` supporting webhook events (`invoice.paid`, `payment.failed`, `subscription.renewed`) without impacting clinical domain services.
