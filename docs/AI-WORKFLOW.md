# Working With an AI Assistant on a Feature

How a developer should work with an AI coding assistant to build a feature from scratch, using this v2 build
as the worked example. The short version: **the AI is fast at producing code and bad at knowing whether that
code is right.** Your job moves from typing to deciding, verifying and owning. Every section below comes from
something that actually happened in this build.

---

## 1. The mindset

1. **You own the outcome; the AI owns nothing.** It won't be paged at 3am. Anything you merge, you must be
   able to explain line by line in an interview or code review.
2. **Generated ≠ verified.** Code that compiles, looks reasonable and passes the tests the AI wrote can
   still be wrong (section 4 has seven examples from this build).
3. **The AI optimises for "looks done".** It will happily report success. Ask for *evidence* (a test run,
   a screenshot, numbers), not a summary.
4. **Make decisions explicit.** If you can't say *why* a choice was made, you can't defend or change it later.
   That's what `DECISIONS.md` is for.

## 2. The loop for one feature

```
 Understand → Decide → Slice → Build → Verify → Review → Record
     ▲                                     │
     └──────── evidence says "wrong" ──────┘
```

| Step | What you do | What you ask the AI | Example from this build |
|---|---|---|---|
| **1. Understand** | Read the existing code and data model first | "Read X and Y. Before proposing anything, list bugs and risks you see." | Reading v1 found 4 real bugs before any new code: filename case (breaks on Linux), Express 4 async crash, duplicate cart lines bypassing the stock check, a deadlock-prone lock order |
| **2. Decide** | Set scope and the non-negotiables (money, security, data integrity) | "Give me 2–3 options for X with trade-offs. Recommend one." | Cutting auth and payments; choosing RTK Query over hand-written `useEffect` |
| **3. Slice** | Split into steps that each leave the app working | "Break this into phases; each must be testable on its own." | `ROADMAP-v2.md` phases 0–7 |
| **4. Build** | Let the AI write the code, one slice at a time | Precise prompts with constraints (section 6) | Migrations → API → tests → UI |
| **5. Verify** | Run it. Tests, a browser, load. Look at the output yourself | "Run the tests and show me the output." "Prove this test can fail." | Mutation test, screenshots, load test |
| **6. Review** | Read every line of the diff with the checklist (section 5) | "Review this diff for bugs, not style." Use a fresh session or a second reviewer | Caught a fragile React-element copy, dead code, misleading copy |
| **7. Record** | Write down why, and what was rejected | "Summarise the decisions in this diff as ADR entries." | `DECISIONS.md` |

## 3. Where AI helps most, and where you must stay in charge

**Hand off freely (then review):**
- Boilerplate: route files, CSS modules, form markup, Dockerfiles, config
- First drafts of SQL and tests (you check the assertions are the *right* assertions)
- Searching the codebase, explaining unfamiliar code, comparing options
- Repetitive refactors (renaming, moving files, updating every call site)
- Tooling: load-test scripts, browser automation, image generators

**Own it yourself (the AI can propose; you decide and verify):**
- **The data model.** Every later decision builds on it.
- **Money, stock and concurrency rules.** Who locks what, in which order; what happens on a retry.
- **Security boundaries.** What the client is trusted with (in this build: nothing about prices); what is
  exposed (public UUIDs, not serial IDs).
- **Scope.** The AI will build whatever you describe, including things you shouldn't build yet.
- **User-facing promises.** Copy that says "free returns" or "email sent" is a promise (see 4.6).
- **The final yes.** Merging is your signature.

## 4. What went wrong in this build, and what caught it

These are real. Each shows that "it looks done" and "it works" are different claims.

### 4.1 Tests passed, but production would have failed: nginx 502s under load
All 35 API tests passed, and the browser flow passed. Then a load test returned **~100,000 HTTP 502s** at
about 2,600 req/s. The cause was nginx opening a new connection per request and running out of ports. No unit
test can find this; only load can. **Lesson:** match the kind of check to the kind of risk. Correctness →
tests. Concurrency → concurrent tests. Capacity → a load test.

### 4.2 A test that could never fail would prove nothing: mutation testing
The deadlock test passed. That doesn't mean it *tests* anything: maybe deadlocks just never happen. So the fix
was temporarily reverted to v1's approach. **18 of 20** requests then failed with 500s, and with the fix all 20
passed. Now the test is known to have teeth. **Lesson:** for your most important tests, break the code on
purpose and confirm the test goes red.

### 4.3 The test was wrong, not the code
A new quote test failed: "coupon should not apply". But 3 × ₹1,499 = ₹4,497, which *is* above BIG500's ₹3,999
minimum. The code was right; the test's assumption was wrong. **Lesson:** when a test fails, first decide which
side is wrong. Never "fix" code to satisfy a test you haven't checked.

### 4.4 Every test passed, but the layout was broken on phones
After the UI was built, the automated browser run recorded zero errors. The screenshots still showed 3 bugs: a
squashed category label, a sold-out email field too narrow to use, and a stray focus box. **Lesson:** look at
the actual output. "No errors" isn't "looks right".

### 4.5 A broken check is not a broken app
A screenshot contact sheet came back blank grey. The app was fine; the review tool was blocked from loading
local files. **Lesson:** when a check fails, verify the check before you start "fixing" the app.

### 4.6 The AI wrote copy that promised things the system doesn't do
Two lines were wrong: "10% off your **first** order" (nothing enforced first-order) and "A confirmation has been
noted for your email" (no email exists). Both were caught in review and rewritten. **Lesson:** review UI text
as claims. Generated copy tends to sound like a real store's, whether or not your system does those things.

### 4.7 An independent review found 7 more bugs after everything was "green"
With 55 tests passing and the smoke run clean, a second agent reviewed only the code, without my reasoning. It
found 7 real bugs, including:
- **A retry that races the original order** got a 409 "out of stock" for an order that *had* been placed.
- **A coupon that stopped qualifying** left checkout permanently failing.
- **The price could change between the quote and the click** and be charged silently.
- **Price filter buckets overlapped**, and **delivery dates were a day early** on a UTC server.

All were fixed with regression tests (see DECISIONS.md D4, D9–D11, E1b). And one more lesson inside the lesson:
my first test for the retry race **passed even with the fix removed**. The race didn't happen often enough to be
caught. It was strengthened (8 copies × 5 rounds) until it failed without the fix and passed with it.
**Lessons:** (1) the author is the worst reviewer of their own work; use fresh eyes. (2) A race-condition test
must be shown to fail without the fix, or it proves nothing.

### 4.8 Smaller things caught in self-review
- A React element was copied with object spread to add a prop. That's fragile, because React's dev-mode
  internals aren't copied. Replaced with `cloneElement`.
- A check for `action.meta?.silent` that could never be true (dead code). Removed.
- A coupon-validate endpoint made redundant by the new quote endpoint. Deleted, so there's one pricing path, not two.

## 5. Review checklist for AI-written code

Go through it for every diff, in this order (most expensive failures first):

**Correctness and data**
- [ ] What happens when two of these run at the same time? (stock, coupons, counters, unique keys)
- [ ] What happens on retry: double-click, network timeout, process restart halfway through?
- [ ] Is every multi-step write inside one transaction? Is the lock order consistent?
- [ ] Are money values integers, and does rounding favour the customer or stay neutral?
- [ ] Does the server recompute everything the client sent that it shouldn't trust (prices, totals, stock)?

**Security**
- [ ] Is every user value a bound parameter? Are dynamic identifiers (sort columns) whitelisted?
- [ ] What does the response expose? (internal IDs, emails, stack traces)
- [ ] Is input validated at the boundary (zod) with limits on length and count?

**Failure behaviour**
- [ ] What does the user see when it fails? Is the error message actionable?
- [ ] Does an error in one place take down more than it should (process crash, blank page)?

**Fit**
- [ ] Is this the simplest thing that works? Is there dead code or a "for the future" abstraction?
- [ ] Does it match the conventions already in the codebase?
- [ ] Is every claim in user-facing copy actually true?

**Evidence**
- [ ] Which test would fail if this line were wrong? If none, is that acceptable?
- [ ] Has it been run (not just read)? At the sizes and devices users have?

## 6. Prompt patterns

**Works well:**
- *Context + constraint + output format:* "Read `services/orders.js` and `002_catalog_v2.sql`. Add coupon
  usage limits. Constraint: two concurrent redemptions of the last use must not both succeed. Show the SQL,
  explain the locking, and write a test that sends two requests at once."
- *Ask for options before code:* "Three ways to store wishlist items without accounts. Trade-offs of each.
  Recommend one."
- *Ask it to attack its own work:* "What inputs break this? What happens under concurrency? Which of these
  tests would still pass if the feature were deleted?"
- *Demand evidence:* "Run it and paste the output." "Take a screenshot at 390px wide."
- *Fresh eyes:* review in a new session, or with a second agent that sees only the diff, not the reasoning.
  The author (human or AI) is biased towards its own code.

**Works badly:**
- "Build me an e-commerce site." Unbounded scope gives generic output you can't explain.
- Accepting "Done! All tests pass" without seeing the run.
- Asking it to make a failing test pass without saying whether the test or the code is wrong.
- Long sessions with no written plan: decisions drift and nobody remembers why.

## 7. Talking about AI use in an interview

Be direct: "I used an AI assistant to write much of the code. I owned the data model, the concurrency design and
the review. Here's a bug it introduced and how I caught it." Then explain section 4.1 or 4.2. Interviewers are
checking whether you understand the code and can judge it, not whether you typed it. Be ready to:
- whiteboard the checkout transaction and explain why `ORDER BY id` prevents deadlocks
- explain why facet counts exclude their own filter
- explain RTK Query vs slices (server state vs client state)
- explain why the load test found something the tests couldn't

## 8. How to study this repo (suggested order)

1. `docs/ROADMAP-v2.md`, then `docs/ARCHITECTURE.md`: get the shape first.
2. `git diff main..v2 -- apps/api/src/services/orders.js`: v1 → v2 checkout, with `DECISIONS.md` section D open.
3. `apps/api/src/services/productQuery.js`: dynamic SQL, facets, recursive CTE, pagination.
4. `apps/web/src/store/`: RTK Query, slices, listener middleware.
5. `apps/web/src/pages/Listing.jsx` + `lib/filters.js`: URL-as-state.
6. `apps/api/test/orders.test.js`: how concurrency is tested.

**Exercises that turn reading into understanding:**
- Remove `ORDER BY v.id` from the lock query and run `npm test -w apps/api`. Why does it (probably) still
  pass? (Hint: what order does `= ANY` return rows in?) Now loop over the items one at a time, as v1 did.
- Make the size facet *not* exclude its own filter. Select "M" on `/c/t-shirts`. What breaks for the shopper?
- Remove `keepalive` from `nginx.conf.template`, run `npm run prod:up && npm run loadtest`, then read
  `docker compose -f docker-compose.prod.yml logs web | grep crit`.
- Build "quick add" (pick a size from the product card) using the loop in section 2. Write the plan and
  decisions first, then the code, then prove it with a test and a screenshot.
