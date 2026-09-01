# MULTI_ROUTE_RUNTIME_SYSTEM

- Mission ID : `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
  `PATH_SELECTION_AND_ELIMINATION.md`, `BASELINE_ENGINE.md`
- Source     : `tools/runtime_cognitive_path_competition_engine.py`,
  `app/src/chat.js`, `app/data/routes.json`

## 1. Architecture

The engine has two faces with the same algorithm:

- **Python `compete(question, nodes)`** (offline / CI) writes
  `audit/PATH_COMPETITION_REPORT.json` and `app/data/routes.json`.
- **Browser `compete(question, nodes)`** in `app/src/chat.js` runs on every
  submit from the chat bar, with no network call.

For each call, 6 strategies execute **simultaneously** over the same input
node list. Each strategy holds an independent `rank(node, qTokens)`
function; the engine sorts the law set by that function and slices the top
`K=10`. The strategies do not share state, do not see each other's choices,
and do not re-rank after seeing competitors. This isolation is what makes
the comparison meaningful.

In parallel, 2 baselines (`naive_selection_priority`, `random`) run through
the **same** `score_route()` pipeline so their numbers sit on the same
scale.

## 2. UI layout

The chat bar is bottom-centered, persistent across all panels:

```
┌──────────────────────────────────────────────────────────────┐
│                       graph / panels                         │
│                                                              │
│        ┌──── chat-results (hidden until first submit) ───┐   │
│        │ Q: <question>                                   │   │
│        │ [card frugale] [card anti_hallu] [card prop_forte] │
│        │ [card temporal] [card structurelle] [card runtime] │
│        │ Baselines (référence) : naive · random          │   │
│        └─────────────────────────────────────────────────┘   │
│                                                              │
│         ┌────────────── chat-bar ──────────────┐             │
│         │ mic │ file │ <input>      │ send ▶ │              │
│         └──────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

Each card shows : strategy label, status tag (`✗ éliminée : <reason>`,
`✓ survit`, or `★ WINNER`), `selection_score`, precision / hallu / noise /
cost / temp / rwa / survival bars, and the 10 chosen law IDs as clickable
links that focus the node in the main graph view (`onPickLaw`).

## 3. Input modalities

- Text submit (Enter or send button).
- Web Speech API mic input (fr-FR, Chrome/Edge only).
- File upload up to 2 Mo : first 600 chars become the question context.

Every submit prints a structured object to the browser console
(`ZORAN PATH COMPETITION`) so the run is auditable from devtools without
leaving the page.

## 4. Limits

- Strategies are hand-weighted. Nothing learns from past runs.
- The 6 strategies are a starting set, not a fixed taxonomy — see
  `COGNITIVE_ROUTE_EVOLUTION.md`.
- "Parallel" is sequential in the JS event loop; the parallelism is
  logical, not physical. With `K=10` over ~500 nodes, runtime is dominated
  by `sort` and stays under 10 ms on a desktop browser.
- Every route sees the same node pool — no source diversity, no per-route
  retrieval. The arena tests ranking choices, not knowledge breadth.
