---
name: no-type-assertions
description: Never use `as`, `any`, or `unknown` — always properly typed code
type: feedback
---

Never use `as` type assertions, `any`, or `unknown` in any code written for this project.

**Why:** The user considers these a sign of improperly typed code. Type assertions hide real type errors and erode type safety. Code should be correctly typed from the ground up, not forced into shape.

**How to apply:** If you reach for `as`, `any`, or `unknown`, stop and find the correct type. For Zod + enums, use `z.nativeEnum(Enum)` instead of `z.enum([...] as [...])`. For generics, constrain properly. There are no exceptions.
