# mars-cmbagent Library Patches

Changes applied locally to `cmbagent` (installed in `.venv`) that **must be merged into the `mars-cmbagent` repository** so they persist across installs.

---

## Patch 1 — Fix: Multi-agent model override ignores user-selected model

**File:** `cmbagent/phases/rfp/base.py`  
**Location:** Inside `RfpPhaseBase.execute()`, the multi-agent model resolution block (~line 238–254)

### Problem

When `multi_agent=True`, `get_phase_models()` reads from `WorkflowConfig.default_llm_model` (always `"gpt-4o"` since `set_workflow_config()` is never called) and **unconditionally overrides** `self.config.model`, ignoring the user's explicit model selection passed via `config_overrides`.

**Console output showed:**
```
Configuring implementation_plan with model=gpt-4.1-2025-04-14 ...
[Implementation Plan] Multi-agent: primary=gpt-4o  ← WRONG: user selection ignored
```

### Fix

Replace the multi-agent override block so it **respects explicit config values** and only falls back to `agent_teams` defaults when no override was provided.

**BEFORE:**
```python
# --- multi-agent model overrides ---
if self.config.multi_agent:
    from cmbagent.phases.rfp.agent_teams import get_phase_models
    _agent_models = get_phase_models(self.phase_type)
    model = _agent_models.get("primary", model)
    resolved = resolve_model_for_provider(model)
    _review_model_name = _agent_models.get("reviewer", _review_model_name)
    review_model = resolve_model_for_provider(_review_model_name)
    _spec_model = self.config.specialist_model or _agent_models.get("specialist", _default_model())
    print(f"[{self.display_name}] Multi-agent: primary={model}, specialist={_spec_model}, reviewer={_review_model_name}")
```

**AFTER:**
```python
# --- multi-agent model overrides ---
if self.config.multi_agent:
    from cmbagent.phases.rfp.agent_teams import get_phase_models
    _agent_models = get_phase_models(self.phase_type)
    # Respect explicit config; fall back to agent_teams defaults
    if model == _default_model():
        model = _agent_models.get("primary", model)
        resolved = resolve_model_for_provider(model)
    if _review_model_name == model or _review_model_name == _default_model():
        if self.config.review_model:
            _review_model_name = self.config.review_model
        else:
            _review_model_name = _agent_models.get("reviewer", _review_model_name)
    review_model = resolve_model_for_provider(_review_model_name)
    _spec_model = self.config.specialist_model or _agent_models.get("specialist", _default_model())
    print(f"[{self.display_name}] Multi-agent: primary={model}, specialist={_spec_model}, reviewer={_review_model_name}")
```

**Logic:** If `self.config.model` was explicitly set to something other than the global default, keep it. Same for `review_model`. `specialist_model` already had correct fallback logic.

---

## Patch 2 — Cloud Phase: Respect RFP-mandated hosting platforms

**File:** `cmbagent/phases/rfp/cloud_phase.py`  
**Location:** Entire file (system_prompt, specialist_system_prompt, build_user_prompt)

### Problem

The cloud phase hardcoded "AWS, Azure, GCP" comparison in all prompts. When an RFP contractually mandated a specific hosting platform (e.g. **NIC Meghraj** government cloud), the LLM still produced an AWS/Azure/GCP design, violating the RFP requirements.

### Fix — system_prompt property

**BEFORE:**
```python
@property
def system_prompt(self) -> str:
    return (
        "You are a cloud infrastructure architect with 20+ years of expertise across "
        "AWS, Microsoft Azure, and Google Cloud Platform.  You have led cloud migrations "
        "and greenfield deployments for Fortune 500 enterprises.  You produce detailed, "
        "data-driven infrastructure designs with professional pricing tables, comparison "
        "matrices, and clear justifications for every architectural decision."
    )
```

**AFTER:**
```python
@property
def system_prompt(self) -> str:
    return (
        "You are a cloud infrastructure architect with 20+ years of expertise across "
        "public cloud platforms (AWS, Azure, GCP) and government/sovereign cloud platforms "
        "(NIC Meghraj, etc.).  You have led cloud migrations and greenfield deployments for "
        "Fortune 500 enterprises and government agencies.  You produce detailed, data-driven "
        "infrastructure designs with professional pricing tables, comparison matrices, and "
        "clear justifications for every architectural decision.  You ALWAYS respect RFP-mandated "
        "hosting requirements — if the RFP specifies a particular hosting platform, you design "
        "exclusively for that platform."
    )
```

### Fix — specialist_system_prompt property

**BEFORE:**
```python
@property
def specialist_system_prompt(self) -> str:
    return (
        "You are a cloud cost optimization specialist and FinOps practitioner with deep "
        "expertise across AWS, Azure, and GCP pricing models.  You will receive a cloud "
        "infrastructure plan. Validate and enrich it:\n"
        "1. Validate cost estimates against current cloud provider pricing (reserved, on-demand, spot)\n"
        "2. Identify cost optimization opportunities — right-sizing, savings plans, committed use\n"
        "3. Verify the provider comparison is fair and uses equivalent service tiers\n"
        "4. Check for missing services or architectural gaps (CDN, WAF, secrets manager)\n"
        "5. Validate disaster recovery design — RPO/RTO targets, multi-region failover\n"
        "6. Ensure security architecture follows cloud provider best practices (landing zones, IAM)\n"
        "7. Verify all cost tables have Monthly + Annual columns with correct math\n"
        "Return the COMPLETE improved document — not a commentary. Output clean markdown only."
    )
```

**AFTER:**
```python
@property
def specialist_system_prompt(self) -> str:
    return (
        "You are a cloud cost optimization specialist and FinOps practitioner with deep "
        "expertise across public and government cloud pricing models.  You will receive a cloud "
        "infrastructure plan. Validate and enrich it:\n"
        "1. Validate cost estimates against current provider pricing (reserved, on-demand, spot where available)\n"
        "2. Identify cost optimization opportunities — right-sizing, savings plans, committed use\n"
        "3. Verify any provider comparison is fair and uses equivalent service tiers\n"
        "4. Check for missing services or architectural gaps (CDN, WAF, secrets manager)\n"
        "5. Validate disaster recovery design — RPO/RTO targets, failover\n"
        "6. Ensure security architecture follows provider best practices and compliance frameworks\n"
        "7. Verify all cost tables have Monthly + Annual columns with correct math\n"
        "8. If the RFP mandates a specific hosting platform, ensure the design is fully compliant with that mandate\n"
        "Return the COMPLETE improved document — not a commentary. Output clean markdown only."
    )
```

### Fix — build_user_prompt method

**Key changes to the user prompt:**

1. **Added `rfp_text = context.task or ""`** — makes original RFP text available for mandate detection

2. **Added "CRITICAL — RFP HOSTING MANDATE CHECK" block** at the top of the prompt:
```
CRITICAL — RFP HOSTING MANDATE CHECK:
Carefully read the original RFP text and the Requirements Analysis above.  If the RFP **mandates or contractually requires** a specific hosting platform (e.g. NIC Meghraj / MeghRaj, government cloud, a particular data centre, or any named infrastructure), you MUST:
- Design the ENTIRE infrastructure on that mandated platform ONLY
- Do NOT propose AWS, Azure, or GCP as primary or alternative options
- Structure all sections below around the mandated platform's capabilities, services, and pricing
- If the mandated platform has limited managed services, propose self-hosted alternatives that run on it
- Acknowledge the mandate explicitly and show compliance

Only if the RFP does NOT mandate a specific platform should you compare AWS, Azure, and GCP as described below.
```

3. **Restructured sections** to be platform-agnostic:
   - Section 1: **"Hosting Platform Identification & Compliance"** (was "Cloud Provider Comparison Matrix" hardcoded to 3 providers)
   - Section 2: **"Cloud / Hosting Provider Comparison Matrix"** — conditional: compare within mandated platform OR across providers
   - Section 3: **"Recommended Hosting Strategy"** (was "Recommended Cloud Provider")
   - Section 7: **"Security Architecture"** — includes government compliance mapping (MeitY, STQC)
   - Section 8: **"Managed Services & Platform Services"** — proposes self-hosted alternatives when mandated platform lacks managed services
   - Removed the "Why Other Providers Were Not Selected" section (irrelevant when platform is mandated)

---

## Summary of affected files

| File | Change Type | Description |
|------|-------------|-------------|
| `cmbagent/phases/rfp/base.py` | Bug fix | Multi-agent model override now respects user-selected `model`, `specialist_model`, `review_model` from config |
| `cmbagent/phases/rfp/cloud_phase.py` | Prompt update | All 3 prompts updated to respect RFP-mandated hosting platforms instead of hardcoding AWS/Azure/GCP |

## How to apply

1. Copy the patched files into the `mars-cmbagent` source repo:
   - `cmbagent/phases/rfp/base.py`
   - `cmbagent/phases/rfp/cloud_phase.py`
2. Run tests to verify
3. Bump version and publish
4. Update `MARS-RFP/Requirements.txt` with the new version
