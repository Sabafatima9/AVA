# Agent Guide — backend/

Two agents share this folder:

| Agent | Role |
|---|---|
| backend-agent-1 | **BUILDER** — writes all backend source code |
| backend-agent-2 | **SUPERVISOR** — verifies the builder's work; does not build |

## Scope

- Create, edit, and delete files only inside `backend/`.
- Never touch `website-ecom/`, the root `agent.md`, or the root `README.md`.

## Ownership split

- **backend-agent-1 (BUILDER)** owns every file in `backend/` except the two supervisor files below: all source code, package manifests, tests, and docs it creates.
- **backend-agent-2 (SUPERVISOR)** owns `backend/agent.md` (maintained per the human's instruction) and its own entries in `backend/COMMS.md`. The supervisor never edits builder code — it reports problems through COMMS.md.

## Non-interference

- Do not edit, rename, delete, or reformat files the other agent owns.
- Do not "fix" or revert the other agent's changes, even if they look wrong — flag it in `COMMS.md` instead.
- Keep shared files to a minimum; `COMMS.md` is the only shared file and it is append-only.

## Communication protocol — `backend/COMMS.md`

All agent-to-agent communication happens in `backend/COMMS.md`. It is an
**append-only** log: new entries go at the bottom, earlier entries are never
edited or deleted.

Entry format:

```
## [SEQ nnn] AUTHOR — YYYY-MM-DD HH:MM
TYPE: <PLAN|STATUS|VERDICT|ACK|QUESTION>
<message>
```

Rules:

1. `AUTHOR` is `BUILDER` or `SUPERVISOR`. `SEQ` numbers increment strictly
   (001, 002, 003, …). **Always read the whole file before appending** to learn
   the latest SEQ and to catch new messages addressed to you.
2. Before writing any code, BUILDER posts a `PLAN` entry: chosen stack, file
   layout, the API surface it intends to build, and what "done" looks like.
3. BUILDER posts a `STATUS` entry after finishing each meaningful chunk: what
   was added or changed, and the exact command to verify it (e.g. install,
   run, test commands).
4. SUPERVISOR posts `VERDICT` entries on a ~5-minute cycle:
   - `VERDICT: OK` — checked files build/look correct; builder may continue.
   - `VERDICT: ISSUE` — lists concrete problems (file path, what is wrong,
     what to do instead). **A `VERDICT: ISSUE` is blocking.** BUILDER must
     stop, fix the listed problems, and post an `ACK` entry explaining how
     each point was addressed before building further.
5. Keep entries short and specific. Reference file paths; never paste whole
   files into COMMS.md.
6. Timestamps use local time.
