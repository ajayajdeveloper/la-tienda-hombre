---
name: catch-up
description: Rebuild full context for la-tienda-hombre at the start of a session — the story from scratch to now, the working rules, current state, and the next step. Use when the user starts or resumes a session, says "catch up", "where were we", "continue", or "what's the status".
---

# Catch up on la-tienda-hombre

Goal: by the end, you and the user should both know what happened from scratch to
now, why the decisions were made, and what to do next. Don't start working on
anything until this is done.

## 1. Read the story (in this order)

1. `JOURNAL.md`: the main record. Read all of it, especially **Ground rules**.
2. `ROADMAP.md`: the original plan. Its checkboxes were never ticked, so trust
   `JOURNAL.md` over the checkboxes.
3. `STUDY.md`: just the section headings (`grep -n '^## ' STUDY.md`), to see which
   topics have revision notes.
4. Git: `git log --oneline -20` and `git status --short`. Uncommitted changes
   usually mean work in progress since the last journal entry.

## 2. Check reality against the story

- `find apps -path '*/node_modules' -prune -o -type f -name '*.js*' -print`. Do the
  files match what the journal says exists? Mention anything new, missing, or renamed.
- Files changed after the last journal entry (`git status`, or `ls -lt` on
  `apps/*/src`): skim them. Those are probably the unfinished thread.
- Environment (report what you find, don't fix it on your own):
  - `docker compose ps -a`. Postgres stops between sessions. If it's down, say
    `npm run db:up` will bring it back (the data is kept).
  - `lsof -i :4000 -i :5174 -i :5433`. Look for leftover dev servers from earlier.

## 3. Give the user a short briefing

Keep it short and easy to scan:

- **The project in one line.**
- **The journey so far:** 4–8 bullets, one per milestone or session, from scratch
  to now.
- **Where we are right now:** last finished item, plus any unfinished work found
  in step 2.
- **Things to watch for:** environment problems found, plus any journal gotcha that
  matters for the next step.
- **Suggested next step:** one concrete suggestion from "Open threads", then ask
  the user what they want to work on.

## 4. Re-confirm the working mode

End the briefing by restating the rule in one line: *"Same mode as before: I explain
line by line, you type it, I review. I won't write anything under `apps/*/src/`."*
Then follow it for the whole session.

When the session wraps up, suggest running `/checkpoint` so the journal stays current.
