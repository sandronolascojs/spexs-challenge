---
name: code-standards
description: Project-specific code quality rules. No magic strings/numbers, enum-driven schemas, SOLID, DRY, SRP, short functions, and senior-engineer-level standards applied at all times — not just when asked.
user-invocable: false
---

# Code Standards

These rules apply to **every file written or modified** in this project, without exception.
The goal is not code that merely works — it is code that is clean, scalable, understandable,
extensible and maintainable across time.

## Files

- [no-magic-values.md](./no-magic-values.md) — no magic strings, numbers, or literals anywhere
- [solid.md](./solid.md) — SOLID principles applied to TypeScript/React
- [functions.md](./functions.md) — short, single-purpose, well-named functions
- [naming.md](./naming.md) — naming conventions that reveal intent
- [types-and-schemas.md](./types-and-schemas.md) — enum-driven Zod schemas, shared types
