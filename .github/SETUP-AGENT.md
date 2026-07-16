# Duraforge Builder Agent — Setup & Usage Guide

**Version**: 1.0  
**Date**: 2026-07-01  
**Status**: ✅ Agent Created & Ready to Use

---

## 🎯 What Was Created

### 1. Agent Definition
- **File**: [`.github/agents/duraforge-builder.agent.md`](.github/agents/duraforge-builder.agent.md)
- **Model**: Claude Opus (orchestration); Claude Sonnet/Haiku per task
- **Purpose**: Autonomous development, validation, and optimization of Duraforge website

### 2. Agent Registry
- **File**: [`.github/AGENTS.md`](.github/AGENTS.md)
- **Purpose**: Registers the agent so it's discoverable in VS Code Chat

### 3. Memory System
Location: `.github/memory/`
- **`progress.md`** — Phase tracking, completed tasks, milestones
- **`validator-gaps.md`** — Detected gaps, fixes applied, escalations
- **`cost-tracker.md`** — AI model selections, 3rd-party tool choices, cost analysis
- **`ux-findings.md`** — UX validation results (10-point audit)
- **`data-seeding-log.md`** — Product & customer seeding logs (one-time ops)

### 4. Skills Directory (Moved)
- **Location**: `.github/skills/` (previously: `skills/`)
- **Contents**: 16 validator + data processing scripts
- **Guide**: [`.github/skills/README.md`](.github/skills/README.md)

---

## 📂 Folder Structure

```
.github/
├── agents/
│   └── duraforge-builder.agent.md          ← Agent definition
├── memory/
│   ├── progress.md                         ← Phase tracking
│   ├── validator-gaps.md                   ← Gap detection log
│   ├── cost-tracker.md                     ← Cost optimization
│   ├── ux-findings.md                      ← UX validation results
│   └── data-seeding-log.md                 ← Product/customer seeding
├── skills/                                 ← Moved from root
│   ├── README.md                           ← Skills guide
│   ├── check_best_matches.py               ← Validator
│   ├── check_direct_matches.py             ← Validator
│   ├── match_deepkamal_to_xref.py          ← Validator
│   ├── inspect_skus.py                     ← Validator
│   ├── read_pdf.py                         ← Document processor
│   ├── read_excel.py                       ← Document processor
│   ├── read_docx.py                        ← Document processor
│   ├── read_image.py                       ← Document processor
│   ├── read_all_docs.py                    ← Bulk processor
│   ├── csv_to_markdown.py                  ← Converter
│   ├── excel_to_markdown.py                ← Converter
│   ├── recover_excel_from_md.py            ← Recovery tool
│   └── [other utilities...]
├── AGENTS.md                               ← Agent registry
├── copilot-instructions.md                 ← Business context (existing)
└── website-requirements.md                 ← Specification (existing)
```

---

## 🚀 How to Use the Agent

### In VS Code Chat

**Type in the Chat panel**:
```
@duraforge-builder Build Phase 1 launch features and seed test data
```

**Or invoke specific tasks**:
```
@duraforge-builder Seed product catalogue with 40+ kits from Deepkamal price list
```

```
@duraforge-builder Run validator scripts and report any gaps
```

```
@duraforge-builder Complete 10-point UX validation walk and check page navigation
```

```
@duraforge-builder Create 25+ mock B2B customers across 5 segments
```

### Agent Autonomy

The agent will:
1. ✅ **Never ask** for routine decisions (it uses the spec as source of truth).
2. ✅ **Always consult** `website-requirements.md` + `copilot-instructions.md`.
3. ✅ **Automatically run** validators post-task.
4. ✅ **Update memory files** with progress, gaps, costs.
5. ✅ **Choose the cheapest AI model** per task.
6. ✅ **Prefer free 3rd-party tools** (Mailchimp, SendGrid, PostHog self-hosted, etc.).
7. ✅ **Report all actions** with cost breakdown at end of session.

### Only Ask When Necessary

The agent will **ask for user input** only if:
- Mandatory API credentials needed (e.g., Stripe test key).
- Major schema redesign required.
- Business decision outside spec scope.

Otherwise: **execute autonomously, log decision, report outcome**.

---

## 📊 Agent Capabilities

| Capability | Status | Notes |
|---|---|---|
| Build code against spec | ✅ | Refs website-requirements.md section 12 |
| Run validators autonomously | ✅ | 4 validator scripts available |
| Auto-fix gaps | ✅ | Logs all fixes in validator-gaps.md |
| Cost optimization | ✅ | Downgrades to Haiku for cheap tasks |
| 3rd-party tool selection | ✅ | Free-first strategy; cost-tracker.md logs choices |
| Product data seeding | ✅ | 40+ kits from Deepkamal price list |
| Mock customer creation | ✅ | 25+ B2B accounts across 5 segments |
| UX validation | ✅ | 10-point audit checklist |
| Memory tracking | ✅ | 5 memory files keep agent focused |
| Session reporting | ✅ | Detailed actions + gaps + costs at end |

---

## 💰 Cost Profile

| Phase | AI Tokens Est. | 3rd-Party Tools | Total |
|---|---|---|---|
| Phase 1 Launch | ~£2–5 | £0 (all free tier) | **~£2–5** |
| Phase 2 Growth | ~£10–20 | ~£100 (Klavioy, Twilio, DPD) | **~£110–120** |
| Phase 3 Scale | ~£20–50 | ~£200 (mobile app, API SaaS) | **~£220–250** |
| **TOTAL (Year 1)** | **~£32–75** | **~£300** | **~£332–375** |

**Status**: On track for <£500 total launch cost ✅

---

## 🎓 Memory System for Agent Resume

If the agent session ends and needs to resume:

1. **Check `progress.md`** → Where did we stop? What phase?
2. **Check `validator-gaps.md`** → Any unresolved issues?
3. **Check `cost-tracker.md`** → What model/tool decisions were made?
4. **Check `data-seeding-log.md`** → Was seeding complete? (Skip if "COMPLETE")
5. **Check `ux-findings.md`** → Any UX issues left to fix?

Agent will resume exactly where it left off, using memory as "lane assist" to stay focused.

---

## ✅ Success Criteria

- ✅ Phase 1 features implemented & validated ← **Target: 2026-07-15**
- ✅ 40+ product kits seeded in database
- ✅ 25+ mock B2B customers created
- ✅ 10-point UX validation completed (no broken navigation)
- ✅ All pages responsive on mobile (iPhone 375px)
- ✅ SEO metadata present on key pages
- ✅ Tone consistent (confident, flirtatious, cheeky British)
- ✅ Cross-reference lookup functional (FPE/Hallite/OEM)
- ✅ Total cost <£500 ← **On track ✅**
- ✅ Final report generated with actions + gaps + costs

---

## 🔧 Troubleshooting

### Agent Not Appearing in VS Code Chat

1. Check that `.github/AGENTS.md` exists and is formatted correctly.
2. Check that [`.github/agents/duraforge-builder.agent.md`](.github/agents/duraforge-builder.agent.md) exists.
3. Reload VS Code: **Ctrl+Shift+P** → "Developer: Reload Window".
4. Check Output panel for any YAML parsing errors.

### Skills Scripts Not Running

1. Verify `.github/skills/` exists and contains `.py` files.
2. Check virtual environment is activated: `.venv\Scripts\Activate.ps1`
3. Verify `requirements.txt` dependencies installed: `pip install -r requirements.txt`
4. Check Python version: `python --version` (3.11+ required)

### Memory Files Not Updating

1. Verify `.github/memory/` folder exists (created during setup).
2. Check file permissions (all memory files should be read/write).
3. If corrupted, delete memory file and agent will recreate on next session.

---

## 📝 Next Steps for User

1. **Invoke Agent**: Open VS Code Chat, type `@duraforge-builder` to activate.
2. **Give Task**: Request Phase 1 build, validation, or data seeding.
3. **Let it Run**: Agent works autonomously; check memory files for progress.
4. **Review Report**: At end of session, agent provides detailed report.
5. **Iterate**: If gaps found, invoke agent again to fix.

---

## 📞 Support

If you need to modify agent behavior:

1. Edit [`.github/agents/duraforge-builder.agent.md`](.github/agents/duraforge-builder.agent.md) directly.
2. Change model selection, tool restrictions, or task descriptions.
3. Reload VS Code.
4. Test with a small task first.

For skill/validator issues, edit individual `.py` files in `.github/skills/`.

---

**Setup Complete!** 🎉 Ready to build Duraforge autonomously.

