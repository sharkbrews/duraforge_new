# Validator Gaps & Fixes Log

**Last Updated**: 2026-07-01  
**Status**: Initial setup; gaps to be detected on first run

---

## Gap Detection Process

After each feature task, the agent will:
1. Run validator scripts from `.github/skills/`
2. Compare output against `website-requirements.md` section 12
3. Log any gaps here with:
   - **Gap ID**: AUTO-001, AUTO-002, etc.
   - **Description**: What's missing or broken
   - **Severity**: Critical / High / Medium / Low
   - **Detection Method**: Which validator script found it
   - **Fix Attempted**: Yes/No, what was tried
   - **Resolution**: Fixed / Escalated / Deferred
   - **Date**: When detected & resolved

---

## Gap Registry

| Gap ID | Description | Severity | Detection | Fix Attempted | Resolution | Date |
|--------|-------------|----------|-----------|---|---|---|
| — | *Gaps will appear here as agent runs validators* | — | — | — | — | — |

---

## Escalated Gaps (Require User Input)

*None yet.*

---

## Deferred Gaps (Phase 2+)

*None yet.*

