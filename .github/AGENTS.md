---
name: agents-registry
description: "Duraforge autonomous agents registry for VS Code Chat"
---

# Duraforge Autonomous Agents

This file registers all custom agents available in the Duraforge VS Code workspace.

## Available Agents

### 🚀 Duraforge Builder Agent
**File**: [`.github/agents/duraforge-builder.agent.md`](.github/agents/duraforge-builder.agent.md)

**Purpose**: Autonomous development, validation, testing, and optimization for the Duraforge e-commerce platform.

**Capabilities**:
- Build features against `website-requirements.md` with `copilot-instructions.md` business context
- Run validator scripts autonomously post-task
- Optimize for cost (cheapest AI models + free 3rd-party tools)
- Seed product data + mock customers (one-time)
- Validate page navigation and UX (10-point audit)
- Track work in persistent memory files (`.github/memory/`)
- Ask minimal questions; decide autonomously
- Report all actions, gaps, mitigations, costs

**Invoke in VS Code Chat**:
```
@duraforge-builder Build Phase 1 launch features
```

**Model**: Claude Opus (for orchestration); downgrades to Sonnet/Haiku per task cost analysis

**Tools**: Filesystem, terminal, semantic search, grep, file search

**Memory Location**: `.github/memory/`
- `progress.md` — Current phase, completed tasks
- `validator-gaps.md` — Detected gaps & fixes
- `cost-tracker.md` — AI model + tool decisions
- `ux-findings.md` — UX validation results
- `data-seeding-log.md` — Product & customer seeding log

---

## Agent Workflow

1. **Load Context** → Read spec + business rules + prior memory
2. **Identify Task** → Map to Phase 1–3 roadmap
3. **Select Tools** → Choose cheapest AI model + free 3rd-party tools
4. **Execute** → Build feature / validate / integrate / seed / test UX
5. **Validate** → Run validators; detect + fix gaps
6. **Report** → Session report with actions, costs, gaps, next steps

---

## Success Criteria

✅ Phase 1 features implemented & validated by 2026-07-15  
✅ 40+ kits seeded; 25+ mock customers created  
✅ UX validated (no broken navigation, tone consistent, mobile responsive)  
✅ Total cost <£500 in AI tokens + 3rd-party SaaS  
✅ Memory files kept current for agent resume  
✅ Final report lists all actions, gaps, mitigations, costs  

