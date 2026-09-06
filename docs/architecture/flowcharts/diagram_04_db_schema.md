# Diagram 4: Database Schema & Entity Relationships

[← Back to Architecture Hub](../README.md) · [← Documentation Hub](../../README.md)

---

## 🗄️ Relational Database Model (At a Glance)

```
       ┌───────────────────────────────┐
       │          AUTH.USERS           │
       │  (Managed by Supabase Auth)   │
       └──────────────┬────────────────┘
                      │ 1:1 (Trigger: handle_new_user)
                      ▼
       ┌───────────────────────────────┐
       │           PROFILES            │
       │  id (PK, UUID = auth.users)   │
       │  email, full_name, credits    │
       │  is_unlimited, is_admin       │
       └──────┬───────────────┬────────┘
              │ 1:N           │ 1:N
              ▼               ▼
┌────────────────────────┐  ┌─────────────────────────┐
│        RESUMES         │  │   CREDIT_TRANSACTIONS   │
│ id (PK), user_id (FK)  │  │ id (PK), user_id (FK)   │
│ file_url, text_content │  │ amount, balance_after   │
│ parsed_content (JSONB) │  │ feature, reason         │
└──────┬──────────────┬──┘  └─────────────────────────┘
       │ 1:N          │ 1:N
       ▼              ▼
┌──────────────┐  ┌────────────────────────┐
│ AI_ANALYSES  │  │    JOB_APPLICATIONS    │
│ id (PK)      │  │ id (PK), user_id (FK)  │
│ resume_id(FK)│  │ resume_id (FK)         │
│ user_id (FK) │  │ company, title, JD     │
│ output(JSONB)│  │ cover_letter_content   │
└──────────────┘  └────────────────────────┘
       ▲
       │ 1:N (Optional Link)
┌──────┴───────────────┐  ┌───────────────────────────┐
│  INTERVIEW_REPORTS   │  │    DAILY_CREDIT_GRANTS    │
│ id (PK), user_id(FK) │  │ id (PK), user_id (FK)     │
│ resume_id (FK, Null) │  │ grant_date, amount        │
│ total_score, report  │  │ (Unique user_id + date)   │
└──────────────────────┘  └───────────────────────────┘
```

---

## 📊 Technical ER Diagram (Mermaid)

```mermaid
erDiagram
    PROFILES ||--o{ RESUMES : owns
    PROFILES ||--o{ CREDIT_TRANSACTIONS : logs
    PROFILES ||--o{ DAILY_CREDIT_GRANTS : receives
    PROFILES ||--o{ INTERVIEW_REPORTS : generates
    PROFILES ||--o{ JOB_APPLICATIONS : writes

    RESUMES ||--o{ AI_ANALYSES : receives
    RESUMES ||--o{ JOB_APPLICATIONS : referenced_by
    RESUMES ||--o{ INTERVIEW_REPORTS : linked_to

    PROFILES {
        uuid id PK
        text email
        text full_name
        int remaining_credits
        int total_credits_granted
        bool is_unlimited
        bool is_admin
        date last_daily_grant_date
        timestamptz last_sign_in_at
        timestamptz created_at
    }

    RESUMES {
        uuid id PK
        uuid user_id FK
        text file_url
        jsonb parsed_content
        text extracted_text
        timestamptz created_at
    }

    AI_ANALYSES {
        uuid id PK
        uuid resume_id FK
        uuid user_id FK
        text analysis_type
        jsonb output_data
        timestamptz created_at
    }

    CREDIT_TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        int amount
        int balance_after
        text feature
        text description
        timestamptz created_at
    }

    INTERVIEW_REPORTS {
        uuid id PK
        uuid user_id FK
        uuid resume_id FK
        int total_score
        text role
        jsonb report_json
        timestamptz created_at
    }

    JOB_APPLICATIONS {
        uuid id PK
        uuid user_id FK
        uuid resume_id FK
        text company_name
        text job_title
        text cover_letter_content
        timestamptz created_at
    }

    IP_CREDIT_CLAIMS {
        text ip_address PK
        uuid user_id FK
        timestamptz claimed_at
    }
```

---

## ⚡ Stored Procedures & Atomic PostgreSQL RPCs

| RPC Function | Parameters | Description & Security |
|---|---|---|
| `deduct_credits()` | `p_user_id, p_feature, p_cost` | Atomically checks `remaining_credits >= p_cost`, deducts credits, inserts audit record into `credit_transactions`, returns new balance. Bypassed if `is_unlimited = true`. |
| `refund_feature_credits()` | `p_user_id, p_feature, p_cost, p_reason` | Atomically restores credits on 502/LLM failure, records `feature = "ai_failure_refund"` in `credit_transactions`. |
| `grant_daily_credits()` | `p_user_id, p_amount` | Checks if `last_daily_grant_date < CURRENT_DATE`. Adds 50 credits, updates date, records grant in `daily_credit_grants`. |
| `get_admin_credit_stats()` | None | Admin-only RPC returning total system credits granted, total consumed, active users, and system liability. |
