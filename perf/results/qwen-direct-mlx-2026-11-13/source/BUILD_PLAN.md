# One local interface, progressively harder tasks

Chosen direction, 13 November 2026: todo CRUD → CRM tasks → compound workflows,
using the same local browser chat and inspectable harness. The earlier lookup
and troubleshooting labs remain comparison material; they are no longer the
immediate next project. CRM means customer relationship management: contacts,
companies, sales opportunities and the work that follows them.

## The request path

Browser message → local server → Qwen tool request → harness argument checks →
SQLite action → tool result sent to Qwen → answer plus visible trace.

Qwen files come from Hugging Face and execute with local MLX-LM, without Ollama.
See DIRECT_MODEL.md for expected pins and the incomplete installation state.
The model proposes the action. Application code executes it and keeps the
database as the source of truth. A reassuring answer is not proof of a saved
change. The interface shows both the answer and actual records.

## Small steps

1. **Create/list:** chat, two tools, saved records, trace, call/time budgets and
   duplicate-write handling. Implementation exists; in-process checks passed.
   Live browser/Qwen flow has not run: socket access was denied and the new
   direct MLX runtime has not installed. Nineteen scripted checks pass after the
   transport migration. Inspect one actual create/list trace before expanding.
2. **Finish todo CRUD:** update and delete by exact ID. Introduce ambiguous
   titles, nonexistent IDs, stale records and read-before-write behavior. Keep
   create/list cases and add new cases; test database effects as well as answers.
3. **CRM tasks:** contacts, companies and follow-up tasks, linked by IDs. Test
   ambiguous names, duplicates, relationship checks and missing fields using
   synthetic customer records. Keep earlier todo actions available.
4. **Compound workflows:** multiple actions, partial failures, recovery and
   permission boundaries. Expand the current one-write limit deliberately and
   test the new failure surface before claiming a workflow is reliable.
5. **Actual adaptation:** review recurring model errors and prepare training
   examples, with separate validation/test cases. Verify compatible weights,
   framework and memory first. Compare unchanged base, harness improvements and
   trained adapter separately, including both old and new task packs. Keep the
   previous accepted version available. No tuning has happened in this app.

## What can remember what?

- SQLite stores tasks. Those are application records, not model weights.
- Recent chat messages provide temporary context; this slice keeps at most two
  completed exchanges and drops whole exchanges to fit its character budget.
- A trained adapter changes model behavior by learning added weights. It can
  improve a new task and regress an old one, so retention has to be measured.

The regression set is a collection of old cases we rerun after changes. Preserve
the original inputs, data, settings, expected effects and model identity. Test
each workflow with its intended tools; a missing tool is not evidence that the
weights forgot a skill. Version capability-dependent expectations: a v1 request
to delete should be refused, while a later explicitly implemented delete has a
new expected result. Preserve both versions instead of silently moving a goal.

## Useful and economical enough

Define success for one task before optimizing it. Measure correct database
effects, honest answers, recovery, elapsed time, model/tool calls, token counts,
memory and relevant training/serving/review costs. Do not use a scripted test's
token counters or runtime as model cost/performance evidence. An 8B model's
suitability and cost advantage are hypotheses until compared on the real job.

Keep the public portfolio text/code based. Record each step, source revision,
actual failure and comparison; write reflections from executed work. This local
interactive lab is separate from the portfolio. Publish no personal todo/CRM
data or private learner answers.
