# AI safety and approval model

## Boundary

AI is a proposal engine, not an authority. It may extract fields, summarize evidence, classify documents, identify discrepancies/risks, recommend prices from supplied inputs, and draft communications. It may not directly mutate business records, send messages, approve anything, select/book a carrier, issue a rate confirmation/invoice, move money, resolve a claim, or override compliance.

## Safe workflow

1. **Purpose gate:** a backend allowlist maps a narrow task to an input schema, output schema, permitted data classes, model configuration, and approval policy.
2. **Data minimization:** load only tenant-authorized fields; redact unnecessary PII/secrets; never provide broad database or object-store access.
3. **Structured call:** request a versioned JSON schema with enums, bounds, nullable/unknown states, field-level source evidence, and issues. No tool capable of business mutation is exposed.
4. **Parse:** reject nonconforming output with Zod; do not coerce invalid monetary, date, location, or enum values silently.
5. **Validate:** deterministic code checks domain constraints, cross-field conflicts, source grounding, required fields, currency, appointment ordering, and policy limits.
6. **Persist as candidate:** store an immutable AI run/recommendation separate from authoritative records, with model/prompt/schema versions and correlation ID.
7. **Human review:** show original source beside proposed values, confidence/provenance, missing/conflicting fields, calculations, and changes. Never use confidence alone as approval.
8. **Approve exact revision:** an authorized human edits/rejects/approves; material edits may require a new approval. Record rationale where policy requires it.
9. **Execute deterministically:** a separate authenticated backend command revalidates permissions, tenant, state, approval hash, invariants, and idempotency, then writes transactionally with audit.
10. **Monitor:** measure parse failures, field accuracy, issue recall, overrides, drift, cost/latency, and safety incidents; provide a kill switch/fallback.

## Extraction contract example

The intake extractor should return `schemaVersion`, candidate fields (value or `null`), normalized value only when supported, source spans/references, per-field confidence as advisory metadata, and an `issues[]` array with `MISSING | AMBIGUOUS | CONFLICTING | INVALID | UNSUPPORTED`, affected fields, evidence, and a proposed clarification question. Required missing values remain null—never inferred from convention.

Dates include local value and time-zone status. Locations distinguish raw text from a validated facility/address. Money recommendations contain integer cents, currency, component inputs, rule version, and arithmetic explanation generated deterministically outside the model.

## Approval matrix

| Proposed action    | AI contribution                                          | Required human gate                                                                      |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Intake/load fields | Extract candidates and issues                            | Reviewer approves load creation/update.                                                  |
| Customer quote     | Suggest risk flags or price range from supplied inputs   | Authorized quote approver approves exact revision before separate send command.          |
| Carrier            | Rank eligible candidates only after deterministic checks | Operations approver selects and approves; compliance warnings cannot be hidden.          |
| Communication      | Draft text                                               | Authorized user reviews; consequential messages also require underlying action approval. |
| Documents/charges  | Extract and compare                                      | Human reviews mismatch/accessorial and finance approvals.                                |
| Delay/exception    | Flag risk and draft response                             | Human confirms action/resolution.                                                        |

## Threats and mitigations

- **Prompt injection in messages/documents:** treat content as data, isolate instructions, prohibit tools, delimit sources, validate outputs, and never let document text change policy.
- **Hallucination/overconfidence:** require evidence and explicit unknowns; deterministic validation and human confirmation.
- **Data leakage:** tenant-scoped retrieval, minimized inputs, provider no-training/retention configuration subject to contract, access logs, and no production data in evaluation fixtures.
- **Model drift:** pin model/config where possible, version prompts/schemas, run offline regression evaluations before change, canary, and rollback.
- **Automation bias:** neutral UI, highlight uncertainty/conflict, make rejection easy, and avoid preselected high-impact approvals.
- **Cost/availability abuse:** rate/budget limits, timeouts, bounded input/output, queue limits, circuit breaker, and manual fallback.

## Evaluation and release gates

Build a de-identified, approved golden set covering missing values, conflicting dates, multiple stops, appointment ambiguity, weight units, prompt injection, damaged text, and out-of-scope modes. Measure exact/normalized field accuracy, missing/conflict recall, false assertions, schema validity, and reviewer correction rate by field. No model/prompt change ships without passing agreed thresholds and red-team cases. Threshold values and prohibited data classes remain business/security decisions.
