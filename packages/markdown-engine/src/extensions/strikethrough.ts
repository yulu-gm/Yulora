import { splice } from "micromark-util-chunked";
import { classifyCharacter } from "micromark-util-classify-character";
import { resolveAll } from "micromark-util-resolve-all";
import type { Code, Event, Extension, State, Token, TokenizeContext, Tokenizer } from "micromark-util-types";

type StrikethroughOptions = {
  singleTilde?: boolean;
};

const STRIKETHROUGH_SEQUENCE_TEMP = "strikethroughSequenceTemporary" as unknown as Token["type"];
const STRIKETHROUGH_SEQUENCE = "strikethroughSequence" as unknown as Token["type"];
const STRIKETHROUGH = "strikethrough" as unknown as Token["type"];
const STRIKETHROUGH_TEXT = "strikethroughText" as unknown as Token["type"];

export function strikethrough(options?: StrikethroughOptions | null): Extension {
  const config = options ?? {};
  const allowSingle = config.singleTilde ?? false;
  const tokenizer = {
    name: "strikethrough",
    tokenize: tokenizeStrikethrough,
    resolveAll: resolveAllStrikethrough
  };

  return {
    text: {
      [126]: tokenizer
    },
    insideSpan: {
      null: [tokenizer]
    },
    attentionMarkers: {
      null: [126]
    }
  };

  function resolveAllStrikethrough(events: Event[], context: TokenizeContext): Event[] {
    let index = 0;

    while (index < events.length) {
      const currentEvent = events[index];
      if (!currentEvent) {
        index += 1;
        continue;
      }

      const [currentPhase, currentToken] = currentEvent;
      const currentIsCloser =
        currentPhase === "enter" &&
        currentToken.type === STRIKETHROUGH_SEQUENCE_TEMP &&
        currentToken._close;
      if (!currentIsCloser) {
        index += 1;
        continue;
      }

      let open = index - 1;
      let matched = false;

      while (open >= 0) {
        const openEvent = events[open];
        if (!openEvent) {
          open -= 1;
          continue;
        }

        const [openPhase, openToken] = openEvent;
        const sameSize =
          currentToken.end.offset - currentToken.start.offset ===
          openToken.end.offset - openToken.start.offset;
        const canPair =
          openPhase === "exit" &&
          openToken.type === STRIKETHROUGH_SEQUENCE_TEMP &&
          openToken._open &&
          sameSize;
        if (!canPair) {
          open -= 1;
          continue;
        }

        currentToken.type = STRIKETHROUGH_SEQUENCE;
        openToken.type = STRIKETHROUGH_SEQUENCE;

        const strikethroughToken = {
          type: STRIKETHROUGH,
          start: { ...openToken.start },
          end: { ...currentToken.end }
        } as Token;
        const strikethroughTextToken = {
          type: STRIKETHROUGH_TEXT,
          start: { ...openToken.end },
          end: { ...currentToken.start }
        } as Token;

        const nextEvents: Event[] = [
          ["enter", strikethroughToken, context],
          ["enter", openToken, context],
          ["exit", openToken, context],
          ["enter", strikethroughTextToken, context]
        ];

        const insideSpan = context.parser.constructs.insideSpan.null;
        if (insideSpan) {
          splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan, events.slice(open + 1, index), context));
        }

        splice(nextEvents, nextEvents.length, 0, [
          ["exit", strikethroughTextToken, context],
          ["enter", currentToken, context],
          ["exit", currentToken, context],
          ["exit", strikethroughToken, context]
        ]);
        splice(events, open - 1, index - open + 3, nextEvents);
        index = open + nextEvents.length - 2;
        matched = true;
        break;
      }

      if (!matched) {
        index += 1;
      }
    }

    for (const event of events) {
      if (event[1].type === STRIKETHROUGH_SEQUENCE_TEMP) {
        event[1].type = "data";
      }
    }

    return events;
  }

  function tokenizeStrikethrough(
    this: TokenizeContext,
    effects: Parameters<Tokenizer>[0],
    ok: Parameters<Tokenizer>[1],
    nok: Parameters<Tokenizer>[2]
  ): State {
    const previous = this.previous;
    const existingEvents = this.events;
    let size = 0;

    return start;

    function start(code: Code) {
      if (previous === 126 && existingEvents[existingEvents.length - 1]?.[1].type !== "characterEscape") {
        return nok(code);
      }

      effects.enter(STRIKETHROUGH_SEQUENCE_TEMP);
      return more(code);
    }

    function more(code: Code) {
      const before = classifyCharacter(previous);

      if (code === 126) {
        if (size > 1) {
          return nok(code);
        }

        effects.consume(code);
        size += 1;
        return more;
      }

      if (size < 2 && !allowSingle) {
        return nok(code);
      }

      const token = effects.exit(STRIKETHROUGH_SEQUENCE_TEMP);
      const after = classifyCharacter(code);
      token._open = !after || (after === 2 && Boolean(before));
      token._close = !before || (before === 2 && Boolean(after));
      return ok(code);
    }
  }
}
