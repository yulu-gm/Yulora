# 2026-04-29 List Wrapping Intake

## Scope

Fix Markdown list rendering when an item contains very long content:
- Long list item text may wrap, but the marker must not be stranded on its own visual line.
- Wrapped continuation lines must start at the same x-position as the first content line.
- Nested list items must preserve their nested indentation when wrapping.
- The behavior must hold both when a list item is inactive and when the cursor is editing that item.

This is a focused visual rendering fix and is not tied to a backlog task id.

## Root Cause

Inactive list lines used inline marker styling without a hanging-indent layout rule. Active list lines were also skipped by the list decoration pipeline, so the focused row still used plain CodeMirror soft wrapping. When a long unbroken token wrapped, the browser could split the marker and content into separate visual lines.

Nested list items exposed a second alignment gap: the first visual line includes the Markdown source prefix (`  - `, `  1. `, or task marker text), but the soft-wrap indent only used a fixed marker width. Child rows therefore wrapped back to the left instead of lining up with their own first content character. The stable fix is to remove inactive Markdown source prefixes from text flow and position the visible marker independently, while hard continuation lines use the same list depth and content offset as their owning item.

During manual follow-up, typing a single trailing `-` after a paragraph exposed an editing-time parsing ambiguity: CommonMark can interpret `paragraph\n-` as a Setext heading, which restyles the previous paragraph while the user is likely starting a new list item. FishMark now treats a document-final single dash as a provisional empty list item instead, keeping the previous line stable.

## Acceptance

- Inactive and active unordered, ordered, and task list rows use a content-start offset.
- Long continuous content wraps inside the content area instead of pushing the item down.
- Child list rows keep their nested offset and align wrapped lines to their own first content line.
- Typing a final single `-` after a paragraph must not restyle or re-indent the previous paragraph.
- Existing Markdown rendering tests continue to pass.
