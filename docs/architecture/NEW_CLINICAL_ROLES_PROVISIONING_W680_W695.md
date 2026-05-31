# New clinical roles needing provisioning — W680–W695 module-gap arc

**Status:** 🟡 action required by the authz owner. **Do NOT** edit
`backend/authorization/role-archetype.map.json` from the module waves — an
active authz workstream (W666–W669, ADR-037, `check-role-registry-divergence`)
owns that file. This doc records the role strings the W680–W695 routes gate on
so they can be provisioned correctly.

## Why this matters

`requireRole([...])` (`middleware/auth.js`) is a **plain case-insensitive string
compare** against `req.user.role` — it does NOT validate against a registry, so
an unregistered role string is not a crash, it just **never matches → 403**. The
deeper PDP (`authorization/can.js`) treats any role absent from
`role-archetype.map.json` as `unmapped-role` and **denies all permission grants**.

Net effect: until each role below is (a) added to `role-archetype.map.json` under
the right archetype AND (b) provisioned in the identity provider, staff holding
that job title cannot reach the new W680–W695 surfaces.

## Roles introduced by the arc (verify against the live 46-role registry)

`receptionist` is already registered. The following were used by W680–W695 route
guards and were **not** in `role-archetype.map.json` at 2026-05-31 — confirm +
add each under the suggested archetype:

| Role string                   | Used by (wave / surface)                | Suggested archetype          |
| ----------------------------- | --------------------------------------- | ---------------------------- |
| `physiotherapist`             | W680 P&O, W693 adjunct-therapy          | THR (therapist)              |
| `occupational_therapist`      | W680, W691 sensory-diet, W693           | THR                          |
| `physician`                   | W680, W683 VFSS, W693                   | THR or a clinician archetype |
| `speech_language_pathologist` | W683 instrumental-swallow               | THR                          |
| `dietitian`                   | W683 (read)                             | THR                          |
| `art_therapist`               | W685 arts-therapy                       | THR                          |
| `music_therapist`             | W685                                    | THR                          |
| `psychologist`                | W685, W689 DTT, W691                    | THR                          |
| `behavior_analyst`            | W689 DTT                                | THR                          |
| `bcba`                        | W689 (Board Certified Behavior Analyst) | THR                          |
| `rbt`                         | W689 (Registered Behavior Technician)   | THR                          |
| `coordinator`                 | W681 seat-allocation, W682 sponsorship  | UNS or BRM                   |
| `social_worker`               | W681, W682                              | UNS                          |
| `finance`, `accountant`       | W682 sponsorship                        | FIN                          |

(`art_therapist` / `music_therapist` / `bcba` / `rbt` are international clinical
certifications; map them to the therapist archetype unless a finer-grained
archetype is created.)

## Action checklist (authz owner)

1. For each unregistered role: add a `role-archetype.map.json` entry with the
   suggested archetype + scope (`B` branch-scoped is the default for clinicians).
2. Run `check-role-registry-divergence` — it must stay green after the additions.
3. Provision the role in the identity provider so users can be assigned it.
4. Spot-check one surface per archetype (e.g. log in as `bcba` → hit
   `/api/v1/dtt-session` → expect 200, not 403).

## Reference

- `middleware/auth.js` `requireRole` (string-compare, no registry validation)
- `authorization/can.js` (`unmapped-role` → deny)
- `backend/authorization/role-archetype.map.json` (the 46-role registry)
- Same pattern previously documented for W356–W370 in
  `docs/architecture/PRODUCTION_CUTOVER_W356_W370.md` (12 roles provisioned there).
