# Where AI tools got it wrong (running log)

Format: what happened → how it was caught.

1. **Extracted code depended on a hidden environment rule.** The prototype was built inside claude.ai, which silently supplies a global `[hidden]{display:none}` rule. Moved to plain hosting, the "hidden" full-screen voice overlay (`.voice{display:flex}`) stayed visible and blocked every click. → Caught by a Playwright smoke test ("`<div hidden id=voice>` intercepts pointer events"), not by reading the code. Fix: add the rule explicitly.
2. **Test I wrote myself clicked a hidden element.** My first smoke script clicked "Run this test" inside a collapsed `<details>` row and timed out. → The error said "element is not visible"; fix was to open the row first. (Test bug, not an app bug.)
3. **Asymmetric case-citation regex truncated party names.** The case-citation detector allowed `(?:of\s+)?` in the first party (e.g., "State of Maharashtra"), but omitted it in the second party regex (`(?:\s+[A-Z][\w.&']*)`). As a result, "Sharma v. Union of India" matched only as "Sharma v. Union", truncating the citation and failing full-title assertion checks. → Caught by `node --test tests/unit.test.mjs`. Fix: allow `(?:of\s+)?` in both party regex groups.
