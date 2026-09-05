/**
 * Minimal, sandboxed evaluator for Salary Rule formulas (e.g.
 * `result = categories['basic'] * 0.5` or `HRA = 20% of Basic` written as
 * `result = categories['basic'] * 0.2`). Deliberately NOT `eval`/`Function` —
 * this is a hand-rolled recursive-descent parser over a tiny grammar so a
 * formula can only read the values it's handed (categories/codes/variables),
 * never touch the Node runtime.
 *
 * Grammar: expr := term (('+'|'-') term)*
 *          term := unary (('*'|'/') unary)*
 *          unary := '-' unary | primary
 *          primary := NUMBER | '(' expr ')' | IDENT | IDENT '[' STRING ']'
 * `IDENT['KEY']` reads `categories`/`codes`; a bare `IDENT` reads `variables`.
 * A leading `result =` / `NAME =` (anything before the first `=`) is stripped.
 */

export interface FormulaContext {
  /** Running per-category totals (e.g. `basic`, `allowance`) — keys matched case-insensitively. */
  categories: Record<string, number>;
  /** Running per-rule-code totals (e.g. `BASIC`, `HRA`) — keys matched exactly as entered. */
  codes: Record<string, number>;
  /** Other named numbers available to the formula, e.g. `wage`, `workedDays`. */
  variables: Record<string, number>;
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'str'; value: string }
  | { type: 'op'; value: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const numStr = src.slice(i, j);
      if (!/^\d+(\.\d+)?$/.test(numStr)) throw new Error(`invalid number "${numStr}"`);
      tokens.push({ type: 'num', value: Number(numStr) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'ident', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) throw new Error('unterminated string literal');
      tokens.push({ type: 'str', value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if ('+-*/()[]'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error(`unexpected character "${ch}"`);
  }
  return tokens;
}

function parse(tokens: Token[], ctx: FormulaContext): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next() as { type: 'op'; value: string };
      const rhs = parseTerm();
      value = op.value === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = next() as { type: 'op'; value: string };
      const rhs = parseUnary();
      value = op.value === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseUnary(): number {
    if (peek() && peek().type === 'op' && peek().value === '-') {
      next();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('unexpected end of formula');

    if (tok.type === 'num') {
      next();
      return tok.value;
    }

    if (tok.type === 'op' && tok.value === '(') {
      next();
      const value = parseExpression();
      const close = next();
      if (!close || close.type !== 'op' || close.value !== ')') throw new Error('expected ")"');
      return value;
    }

    if (tok.type === 'ident') {
      next();
      const name = tok.value;
      if (peek() && peek().type === 'op' && peek().value === '[') {
        next();
        const keyTok = next();
        if (!keyTok || keyTok.type !== 'str') throw new Error(`expected a quoted key after ${name}[`);
        const closeBr = next();
        if (!closeBr || closeBr.type !== 'op' || closeBr.value !== ']') throw new Error('expected "]"');
        if (name === 'categories') return ctx.categories[keyTok.value.toLowerCase()] ?? 0;
        if (name === 'codes') return ctx.codes[keyTok.value] ?? 0;
        throw new Error(`unknown lookup "${name}[...]" — only categories[...] and codes[...] are supported`);
      }
      if (name in ctx.variables) return ctx.variables[name];
      throw new Error(`unknown identifier "${name}"`);
    }

    throw new Error(`unexpected token in formula`);
  }

  const result = parseExpression();
  if (pos !== tokens.length) throw new Error('unexpected trailing characters');
  return result;
}

/** Throws on any malformed/unsupported formula — callers should catch and surface it as a payslip warning. */
export function evaluateFormula(source: string, ctx: FormulaContext): number {
  const eqIndex = source.indexOf('=');
  const expr = eqIndex >= 0 ? source.slice(eqIndex + 1) : source;
  const trimmed = expr.trim();
  if (!trimmed) throw new Error('empty formula');
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) throw new Error('empty formula');
  return parse(tokens, ctx);
}
