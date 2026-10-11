---
name: checkpoint
description: Save this session's progress on la-tienda-hombre into JOURNAL.md so the next session can pick up without starting from zero. Use when the user says "checkpoint", "save progress", "wrap up", "end session", or is about to stop working.
---

# Checkpoint this session into JOURNAL.md

Goal: the next session's `/catch-up` should be able to rebuild everything that
happened today from `JOURNAL.md` alone.

## 1. Gather what happened

- Look back over this conversation: what was taught, what the user built, what was
  tested and how, bugs hit, decisions made, corrections the user gave.
- `git status --short` and `git diff --stat`: which files changed.
- Read every changed file under `apps/*/src/` before calling it "done". The user
  has pasted code into the wrong place before.

## 2. Add a new entry to JOURNAL.md

Put it **after the last dated entry and before `## Open threads`**. Use the same
format as the existing entries:

```markdown
## YYYY-MM-DD — <milestone / theme>

- What was built (file paths; mention odd names like `product.js` or `checkout.jsx`).
- How it was tested (curl, browser, concurrency test, ...). Say plainly if something
  was NOT tested.
- Decisions made, and why.
- Problems hit / lessons learned (only ones worth remembering later).
- Unfinished work: exactly where we stopped, if something is half done.
```

Use today's real date. Keep it to facts, around 5–12 bullets.

## 3. Keep the rest of the journal accurate

- Update **Open threads / possible next steps**: remove finished items, add new ones.
- If a ground rule or locked-in decision changed, edit that section directly. Don't
  leave contradicting entries in the file.
- If a new topic was learned, ask whether the user wants `STUDY.md` updated too.
  Don't change it without asking.

## 4. Offer to commit

Show the journal diff, then offer to commit it (and any other work) with a clear
message. Commit only if the user says yes. **No Co-Authored-By or Claude
attribution: the user is the only author.**
