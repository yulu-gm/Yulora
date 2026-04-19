import { Decoration } from "@codemirror/view";
import { type Range } from "@codemirror/state";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import type { Parser } from "@lezer/common";
import {
  javascriptLanguage,
  jsxLanguage,
  tsxLanguage,
  typescriptLanguage
} from "@codemirror/lang-javascript";
import { pythonLanguage } from "@codemirror/lang-python";
import { jsonLanguage } from "@codemirror/lang-json";
import { cssLanguage } from "@codemirror/lang-css";
import { htmlLanguage } from "@codemirror/lang-html";
import { markdownLanguage } from "@codemirror/lang-markdown";
import { rustLanguage } from "@codemirror/lang-rust";
import { cppLanguage } from "@codemirror/lang-cpp";
import { javaLanguage } from "@codemirror/lang-java";
import { goLanguage } from "@codemirror/lang-go";
import { StandardSQL } from "@codemirror/lang-sql";
import { yamlLanguage } from "@codemirror/lang-yaml";
import { phpLanguage } from "@codemirror/lang-php";
import { csharpLanguage } from "@replit/codemirror-lang-csharp";

const LANGUAGE_PARSERS: Record<string, Parser> = {
  js: javascriptLanguage.parser,
  javascript: javascriptLanguage.parser,
  mjs: javascriptLanguage.parser,
  cjs: javascriptLanguage.parser,
  jsx: jsxLanguage.parser,
  ts: typescriptLanguage.parser,
  typescript: typescriptLanguage.parser,
  tsx: tsxLanguage.parser,
  py: pythonLanguage.parser,
  python: pythonLanguage.parser,
  json: jsonLanguage.parser,
  json5: jsonLanguage.parser,
  css: cssLanguage.parser,
  scss: cssLanguage.parser,
  html: htmlLanguage.parser,
  htm: htmlLanguage.parser,
  xml: htmlLanguage.parser,
  svg: htmlLanguage.parser,
  vue: htmlLanguage.parser,
  md: markdownLanguage.parser,
  markdown: markdownLanguage.parser,
  rs: rustLanguage.parser,
  rust: rustLanguage.parser,
  c: cppLanguage.parser,
  h: cppLanguage.parser,
  cpp: cppLanguage.parser,
  "c++": cppLanguage.parser,
  cc: cppLanguage.parser,
  cxx: cppLanguage.parser,
  hpp: cppLanguage.parser,
  hh: cppLanguage.parser,
  hxx: cppLanguage.parser,
  objc: cppLanguage.parser,
  // HLSL / GLSL / shader code: reuse the C/C++ parser as a close approximation.
  hlsl: cppLanguage.parser,
  glsl: cppLanguage.parser,
  shader: cppLanguage.parser,
  metal: cppLanguage.parser,
  java: javaLanguage.parser,
  kotlin: javaLanguage.parser,
  kt: javaLanguage.parser,
  go: goLanguage.parser,
  golang: goLanguage.parser,
  sql: StandardSQL.language.parser,
  mysql: StandardSQL.language.parser,
  postgresql: StandardSQL.language.parser,
  postgres: StandardSQL.language.parser,
  sqlite: StandardSQL.language.parser,
  yaml: yamlLanguage.parser,
  yml: yamlLanguage.parser,
  php: phpLanguage.parser,
  cs: csharpLanguage.parser,
  csharp: csharpLanguage.parser,
  "c#": csharpLanguage.parser
};

function resolveParser(info: string | null): Parser | null {
  if (!info) return null;
  const key = info.trim().toLowerCase().split(/\s+/)[0];
  if (!key) return null;
  return LANGUAGE_PARSERS[key] ?? null;
}

export function appendCodeHighlightRanges(
  source: string,
  codeStartOffset: number,
  codeEndOffset: number,
  info: string | null,
  ranges: Range<Decoration>[]
): void {
  if (codeEndOffset <= codeStartOffset) {
    return;
  }
  const parser = resolveParser(info);
  if (!parser) {
    return;
  }
  const code = source.slice(codeStartOffset, codeEndOffset);
  let tree;
  try {
    tree = parser.parse(code);
  } catch {
    return;
  }
  highlightTree(tree, classHighlighter, (from, to, classes) => {
    if (to <= from || !classes) {
      return;
    }
    ranges.push(
      Decoration.mark({ class: classes }).range(codeStartOffset + from, codeStartOffset + to)
    );
  });
}
