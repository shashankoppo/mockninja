# MOCK NINJA — Schema Contract

> The SQL migrations are the source of truth. This file is a readable index. Update on every schema change.

## Tables and columns

### profiles
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | references auth.users ON DELETE CASCADE |
| email | text | denormalized |
| full_name | text | display name |
| role | text | CHECK in STUDENT/EDITOR/ADMIN, default STUDENT |
| referral_code | text | unique |
| referred_by | uuid | references profiles |
| entry_source | text | |
| birth_year | int | for age gate (Patch 2) |
| guardian_email | text | for under-18 consent (Patch 2) |
| guardian_consent_at | timestamptz | set ONLY by Edge Function (Patch 2) |
| consent_version | text | (Patch 2) |
| last_active_at | timestamptz | activity tracking (Patch 2) |
| email_nudges | boolean | default false (Patch 2) |
| daily_mock_size | int | CHECK in 10/15/20/30, default 15 (Patch 2) |
| created_at | timestamptz | default now() |

### subjects
| Column | Type | Notes |
|---|---|---|
| id | int PK | 1=Physics, 2=Chemistry, 3=Mathematics |
| name | text | |

### chapters
| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| subject_id | int FK → subjects | ON DELETE CASCADE |
| name | text | NCERT/JEE standard |
| class_level | int | CHECK 11 or 12 |
| ordinal | int | display order |

### questions
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| chapter_id | int FK → chapters | ON DELETE CASCADE |
| type | text | CHECK in MCQ/NUMERICAL |
| difficulty | text | CHECK in EASY/MEDIUM/HARD |
| statement_tex | text | question in TeX |
| options_json | jsonb | MCQ options with ids a/b/c/d; null for numerical |
| answer_json | jsonb | correct answer |
| tolerance | numeric | for numerical answers |
| solution_tex | text | solution in TeX |
| review_status | text | CHECK in DRAFT/REVIEW/PUBLISHED/REJECTED, default DRAFT |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | default now() |
| source | text | CHECK in HUMAN/IMPORTED/AI_GENERATED, default HUMAN (Patch 2) |
| ai_validation_json | jsonb | AI validation results (Patch 2) |
| statement_hash | text | normalised hash for duplicate detection (Patch 2) |
| reviewed_by | uuid FK → profiles | who approved (Patch 2) |

### mock_tests
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| title | text | |
| category | text | full syllabus / subject test / chapter test |
| mode | text | CHECK in PRACTICE/EXAM |
| duration_min | int | |
| total_marks | int | |
| access | text | CHECK in FREE/PREMIUM, default FREE |
| status | text | CHECK in DRAFT/PUBLISHED/ARCHIVED, default DRAFT |
| proctoring_profile | text | |
| created_at | timestamptz | default now() |
| kind | text | CHECK in STANDARD/DAILY_TARGET/MISTAKE_REATTEMPT/CUSTOM_TOPICS/AI_STUDIO, default STANDARD (Patch 2) |
| owner_user_id | uuid FK → profiles | for private mocks (Patch 2) |
| visibility | text | CHECK in PUBLIC/PRIVATE, default PUBLIC (Patch 2) |
| meta_json | jsonb | metadata (requested/delivered counts) (Patch 2) |
| marking_scheme | jsonb | default {"mcq":{"correct":4,"wrong":-1},"numerical":{"correct":4,"wrong":0}} (004) |

### mock_test_questions
| Column | Type | Notes |
|---|---|---|
| mock_test_id | uuid FK → mock_tests | ON DELETE CASCADE |
| question_id | uuid FK → questions | ON DELETE CASCADE |
| position | int | question order |
| section | text | section label |
| | | PK (mock_test_id, question_id) |

### attempts
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles | ON DELETE CASCADE |
| mock_test_id | uuid FK → mock_tests | ON DELETE CASCADE |
| status | text | CHECK in IN_PROGRESS/SUBMITTED/REATTEMPT/EXPIRED |
| started_at | timestamptz | default now() |
| submitted_at | timestamptz | |
| score | numeric | set by server grading |

### responses
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| attempt_id | uuid FK → attempts | ON DELETE CASCADE |
| question_id | uuid FK → questions | ON DELETE CASCADE |
| answer | jsonb | student's answer |
| time_spent_sec | int | |
| flagged | boolean | default false |
| | | UNIQUE (attempt_id, question_id) |
| is_correct | boolean | **NOT YET ADDED** — arrives in Phase 5 |
| awarded_marks | numeric | **NOT YET ADDED** — arrives in Phase 5 |

### student_focus_topics (Patch 2)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid FK → profiles | ON DELETE CASCADE |
| chapter_id | int FK → chapters | ON DELETE CASCADE |
| position | int | |
| | | PK (user_id, chapter_id), max 5 per user (trigger) |

### mastery_scores (Patch 2)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid FK → profiles | ON DELETE CASCADE |
| chapter_id | int FK → chapters | ON DELETE CASCADE |
| belt | text | CHECK in UNRATED/WHITE/YELLOW/GREEN/BLUE/BROWN/BLACK |
| score | numeric | 0–100 |
| evidence_count | int | distinct questions answered |
| latest_answer_at | timestamptz | |
| updated_at | timestamptz | default now() |
| | | PK (user_id, chapter_id) |

### user_daily_mocks (Patch 2)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | ON DELETE CASCADE |
| mock_test_id | uuid FK → mock_tests | ON DELETE CASCADE |
| for_date | date | IST date |
| created_at | timestamptz | |
| | | UNIQUE (user_id, for_date) |

### public_profiles (Patch 2)
| Column | Type | Notes |
|---|---|---|
| user_id | uuid PK FK → profiles | ON DELETE CASCADE |
| handle | text | unique, 3–20 chars |
| opt_in_leaderboard | boolean | default false |
| opt_in_share | boolean | default false |
| belt_snapshot_json | jsonb | cached belts for share card |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### notification_log (Patch 2)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles | ON DELETE CASCADE |
| type | text | CHECK in INACTIVE_2D/INACTIVE_3D/GUARDIAN_CONSENT/UNSUBSCRIBE |
| sent_at | timestamptz | default now() |
| created_at | timestamptz | default now() |

### subscription_plans (022, extended 024)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| name | text | |
| slug | text | unique |
| description | text | |
| price_inr | int | rupees, default 0 |
| billing_period | text | default MONTHLY |
| features_json | jsonb | array of feature strings |
| is_active | boolean | default true |
| sort_order | int | default 0 |
| pricing_model | text | TIERS or BUNDLES, default TIERS |
| mock_quota | int | included mock count for bundles, nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### user_subscriptions (022)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → auth.users | ON DELETE CASCADE, default auth.uid() |
| plan_id | uuid FK → subscription_plans | ON DELETE SET NULL |
| status | text | default ACTIVE |
| started_at | timestamptz | default now() |
| expires_at | timestamptz | |
| stripe_session_id | text | for Stripe checkout |
| created_at | timestamptz | default now() |

### question_reports (024)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → auth.users | default auth.uid(), reporter |
| question_id | uuid FK → questions | reported question |
| attempt_id | uuid FK → attempts | attempt context, nullable |
| mock_test_id | uuid FK → mock_tests | mock context, nullable |
| reason | text | INCORRECT/AMBIGUOUS/TYPO/IMAGE/OTHER |
| details | text | 10–2000 character student explanation |
| status | text | OPEN/IN_REVIEW/RESOLVED/DISMISSED |
| admin_note | text | staff-only review note |
| resolved_by | uuid FK → profiles | staff member for closed outcomes |
| resolved_at | timestamptz | staff resolution timestamp |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### test_feedback
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → auth.users | default auth.uid() |
| attempt_id | uuid FK → attempts | UNIQUE with user_id |
| mock_test_id | uuid FK → mock_tests | nullable |
| rating | int | 1–5 |
| review | text | short review |
| feedback | text | general feedback |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | touch_test_feedback trigger |

### ai_usage_ledger (Patch 2)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| purpose | text | CHECK in STUDIO/DAILY_TOPUP |
| tokens_in | int | |
| tokens_out | int | |
| cost_paise | int | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | default now() |

## RLS policies

All tables have RLS enabled. Summary of who can do what:

| Table | Student SELECT | Student INSERT | Student UPDATE | Student DELETE | Staff |
|---|---|---|---|---|---|
| profiles | own row | no (trigger) | own, safe cols only | no | full |
| subjects | all | no | no | no | full CRUD |
| chapters | all | no | no | no | full CRUD |
| questions | **NO ACCESS** | no | no | no | full CRUD |
| mock_tests | PUBLISHED + own PRIVATE | no | no | no | full CRUD |
| mock_test_questions | for PUBLISHED mocks | no | no | no | full CRUD |
| attempts | own | no | no | no | SELECT all |
| responses | own (via attempt) | no | no | no | SELECT all |
| student_focus_topics | own | own (max 5) | no | own | no |
| mastery_scores | own | no | no | no | SELECT all |
| user_daily_mocks | own | no | no | no | SELECT all |
| public_profiles | all | own | own | no | no |
| notification_log | own | no | no | no | SELECT all |
| ai_usage_ledger | **NO ACCESS** | no | no | no | SELECT all |
| test_feedback | own | own (SUBMITTED only) | own | own | SELECT all, UPDATE all |

## Functions (with who may execute)

| Function | Security | Executed by | Purpose |
|---|---|---|---|
| handle_new_user() | DEFINER | trigger only | Auto-create profile on auth.users insert |
| is_staff() | DEFINER | authenticated | Returns true if caller is EDITOR/ADMIN |
| guard_profile_columns() | DEFINER | trigger only | Blocks students from changing protected columns |
| enforce_max_focus_topics() | DEFINER | trigger only | Blocks 6th focus topic |
| can_go_public(uuid) | INVOKER | authenticated | True if 18+ or guardian consented |
| refresh_mastery(uuid) | DEFINER | service role only | Recompute mastery from responses |
| build_daily_target_mock(uuid, int, numeric, date) | DEFINER | service role only | Build private daily mock |
| get_leaderboard(int, int, int) | DEFINER | authenticated | Leaderboard for opted-in students |
| auto_generate_daily_mocks() | DEFINER | cron/postgres only | Batch-generate daily mocks for all opted-in students |
| set_live_pricing_model(text) | INVOKER | authenticated (admin) | Switch active pricing model (TIERS/BUNDLES) atomically |
| switch_to_free_plan() | INVOKER | authenticated | Cancel active subscription and create free row atomically |

## Views

| View | Security | Purpose |
|---|---|---|
| v_inactive_for_nudge | INVOKER (security_invoker=true) | Students inactive 2–3 days with nudges on |

## Edge Functions (inputs, outputs, auth)

(No Edge Functions yet — arrive in Phase 3+.)

## Storage buckets

(No buckets yet — arrive in Phase 4.)

## Cron jobs

| Job name | Schedule | Purpose |
|---|---|---|
| daily-mock-generation | `30 0 * * *` (00:30 UTC = 6:00 AM IST) | Calls auto_generate_daily_mocks() to batch-generate daily target mocks for students with email_nudges enabled |

## Config flags and app_settings keys

| Flag / key | Default | Where defined | Notes |
|---|---|---|---|
| REQUIRE_GUARDIAN_CONSENT_FOR_MINORS | true | Phase 3 (pending) | Legal decision; needs legal review. |
| REQUIRE_SECOND_REVIEWER | true | Phase 4 (pending) | reviewed_by must differ from created_by. |
| AI_ENABLED | false | Phase 9 (pending) | Master kill switch. |
| AI_AUTO_PUBLISH | false | Phase 9 (pending) | |
| AI_TOPUP_ENABLED | false | Phase 9 (pending) | |
| BETA_INVITE_ONLY | (pending) | Phase 10 (pending) | |

## Env var names (names only, never values)

| Name | Scope | Purpose |
|---|---|---|
| VITE_SUPABASE_URL | Client | Supabase project URL. |
| VITE_SUPABASE_ANON_KEY | Client | Supabase anon (public) key. |

## Migrations applied

| # | Filename | Summary |
|---|---|---|
| 001 | 001_base.sql | Base tables: profiles, subjects, chapters, questions, mock_tests, mock_test_questions, attempts, responses + profile trigger |
| 002 | 002_hardening.sql | RLS on all tables, is_staff(), guard_profile_columns trigger, policies |
| 003 | 003_patch2_focus_mastery.sql | Focus topics, mastery, daily mocks, leaderboard, public profiles, notification log, AI ledger, Patch 2 columns, all functions |
| 004 | 004_patch2_fixes.sql | Advisory lock on build_daily_target_mock, marking_scheme column |
| 005 | 005_fix_function_grants.sql | Explicit REVOKE of EXECUTE from anon/authenticated on sensitive functions |
| 006 | 006_fix_advisor_findings.sql | can_go_public → SECURITY INVOKER |
| 007 | 007_fix_view_security.sql | Drop/recreate v_inactive_for_nudge |
| 008 | 008_fix_view_invoker.sql | Attempt ALTER VIEW (syntax not supported) |
| 009 | 009_fix_view_invoker_v2.sql | Recreate view WITH (security_invoker = true) |
| 010 | 010_seed_subjects_chapters.sql | Seed 3 subjects + 30 chapters |
| 011 | 011_add_grading_columns.sql | is_correct + awarded_marks on responses |
| 012 | 012_homepage_content.sql | Homepage content table |
| 013 | 013_seed_questions_and_mocks.sql | Seed sample questions and mocks |
| 014 | 014_add_bookmarks_table.sql | Bookmarks table |
| 015 | 015_homepage_tables_and_rpc.sql | Homepage tables and RPC |
| 016 | 016_avatar_and_notifications.sql | Avatar and notifications |
| 017 | 017_anon_read_published_mocks.sql | Anon read published mocks |
| 018 | 018_admin_homepage_management.sql | Admin homepage management |
| 019 | 019_support_inquiries_and_admin_profile.sql | Support inquiries + admin profile |
| 020 | 020_allow_self_update_full_name.sql | Allow self-update full_name |
| 021 | 021_support_inquiry_notification_type.sql | Support inquiry notification type |
| 022 | 022_subscription_plans.sql | Subscription plans + user subscriptions tables |
| 023 | 023_pg_cron_daily_mock_generation.sql | Enable pg_cron, auto_generate_daily_mocks() function, schedule daily-mock-generation cron job |
| 024 | 024_pricing_models_and_live_switch.sql | pricing_model + mock_quota columns, set_live_pricing_model() RPC, seed bundle plans |
| 025 | 025_otp_phone_and_referral_discounts.sql | referral_codes table, referral + invoice RPCs, phone columns |
| 026 | test_feedback.sql | test_feedback table + RLS + touch trigger |
| 027 | 20261102112638_20261102_u5_question_bank_licence_and_import_batches.sql | question licence metadata, import_batches table, and batch rollback function |
| 028 | 20261104150000_allow_staff_import_batch_writes | staff-owned import batch insert/update policies |

## import_batches

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | generated automatically |
| created_by | uuid | staff profile that created the batch; set NULL if the profile is removed |
| file_name | text | uploaded file name |
| rows_total | int | rows received |
| rows_ok | int | rows imported successfully |
| rows_failed | int | rows rejected |
| status | text | PENDING, COMPLETED, PARTIAL, or ROLLED_BACK |
| created_at | timestamptz | creation time |

Staff can read all batches, insert batches owned by themselves, and update only batches they created. The server importer may write through the service role.
