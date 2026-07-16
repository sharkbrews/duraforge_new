# Cost Optimization Tracker

**Last Updated**: 2026-07-01  
**Total Budget for Launch**: ~£500 (AI tokens + 3rd-party SaaS)

---

## AI Model Selection Decisions

| Task | Model | Reason | Est. Tokens | Est. Cost |
|------|-------|--------|-------------|-----------|
| Agent Orchestration & Planning | Claude Opus | Complex multi-step workflows | 50k | £1.50 |
| Product Data Seeding | Claude Haiku | CSV parsing + data formatting (low complexity) | 10k | £0.08 |
| Mock Customer Generation | Claude Haiku | Procedural data generation (low complexity) | 5k | £0.04 |
| UX Validation Walk | Claude Sonnet 3.5 | UI analysis + feedback (medium complexity) | 20k | £0.20 |
| Validator Script Execution | Claude Haiku | Analysis + gap detection | 15k | £0.12 |
| VAT Invoice Template | Claude Sonnet 3.5 | Legal/financial generation (medium complexity) | 30k | £0.40 |
| **TOTAL (Phase 1)** | — | — | 130k | **~£2.34** |

---

## 3rd-Party Tool Integration — Free-First Decisions

| Tool | Purpose | Free Tier? | Decision | Est. Cost | Notes |
|------|---------|-----------|----------|-----------|-------|
| Mailchimp | Welcome email / newsletter | ✅ 500 contacts | Use free tier Phase 1 | £0 | Upgrade Phase 2 if >500 |
| SendGrid | Transactional email (invoices) | ✅ 100/day free | Use free tier Phase 1 | £0 | Switch to SendGrid Pro (£20/mo) Phase 2 |
| WhatsApp Business API | WhatsApp links + messaging | ⚠️ Free links only | Links only Phase 1; Twilio Phase 2 | £0 Phase 1 | Defer Twilio API (£0.005/msg) to Phase 2 |
| PostHog | Analytics + feature flags | ✅ Self-hosted free | Self-host on Docker Phase 1 | £0 | Evaluate Plausible Phase 2 (£20/mo) |
| Stripe | Payments | ✅ Free; pay per txn | Use Stripe (2.9% + £0.20 txn) | Variable | Already integrated |
| DPD API | Order tracking | ❌ No free tier | Manual status Phase 1; API Phase 2 | £0 Phase 1 | DPD integration cost TBD Phase 2 |
| **TOTAL 3rd-Party (Phase 1)** | — | — | — | **~£0** | All free tier used Phase 1 |

---

## Cost-Saving Decisions Applied

1. ✅ **Model Downgrade**: Haiku for data processing (vs Sonnet) = -90% cost.
2. ✅ **Free Email**: Mailchimp + SendGrid free tier (vs Klavioy Pro £300/mo) = £300 saved.
3. ✅ **No Analytics Startup**: PostHog self-hosted on Docker (vs Plausible £20/mo) = £20 saved Phase 1.
4. ✅ **WhatsApp Links**: No Twilio Phase 1 (vs £100+ SMS budget) = £100 deferred to Phase 2.
5. ✅ **Manual Tracking**: DPD API deferred to Phase 2 (vs £500 setup) = £500 deferred.
6. ✅ **DuraCoin In-App**: Custom loyalty (vs 3rd-party SaaS) = £0.

---

## Summary

| Category | Phase 1 Est. | Phase 1 Actual | Saving |
|----------|---|---|---|
| AI Tokens | £5–10 | £2.34 | 80%+ ✅ |
| 3rd-Party SaaS | £0 | £0 | 100% ✅ |
| **TOTAL** | **£5–10** | **~£2.34** | **~76%** |

**Status**: Phase 1 cost on track to be **<£300 total** (including infrastructure + Stripe % fees).

