import type { Token } from "./tokens.ts";

export interface ExpectationConst {
  readonly NONE: null;
  readonly FUNCTION_NAME: "EXPECT_FUNCTION_NAME";
  readonly CLASS_NAME: "EXPECT_CLASS_NAME";
  readonly PROPERTY: "EXPECT_PROPERTY";
}

export const Expectation: ExpectationConst = Object.freeze({
  NONE: null,
  FUNCTION_NAME: "EXPECT_FUNCTION_NAME",
  CLASS_NAME: "EXPECT_CLASS_NAME",
  PROPERTY: "EXPECT_PROPERTY",
});

export type Expectation = ExpectationConst[keyof ExpectationConst];

export interface ContextKindConst {
  readonly BLOCK: "BLOCK";
  readonly FUNCTION: "FUNCTION";
  readonly PARAMETERS: "PARAMETERS";
  readonly CLASS: "CLASS";
  readonly OBJECT: "OBJECT";
  readonly ARRAY: "ARRAY";
  readonly IMPORT: "IMPORT";
  readonly EXPORT: "EXPORT";
  readonly TEMPLATE_EXPRESSION: "TEMPLATE_EXPRESSION";
}

export const ContextKind: ContextKindConst = Object.freeze({
  BLOCK: "BLOCK",
  FUNCTION: "FUNCTION",
  PARAMETERS: "PARAMETERS",
  CLASS: "CLASS",
  OBJECT: "OBJECT",
  ARRAY: "ARRAY",
  IMPORT: "IMPORT",
  EXPORT: "EXPORT",
  TEMPLATE_EXPRESSION: "TEMPLATE_EXPRESSION",
});

export type ContextKind = ContextKindConst[keyof ContextKindConst];

export interface Context {
  kind: ContextKind;
  params: Set<string> | null;
  names: string[];
  expectName: boolean;
  bindsNames: boolean;
  isFnParams: boolean;
}

export function createContext(
  kind: ContextKind,
  props: Partial<Omit<Context, "kind">> = {},
): Context {
  return {
    kind,
    params: null,
    names: [],
    expectName: false,
    bindsNames: false,
    isFnParams: false,
    ...props,
  };
}

export interface HighlightState {
  contexts: Context[];
  expectation: Expectation;
  previousToken: Token | null;
  previousValue: string | null;
  declarations: Map<string, "function" | "class">;
  globalParams: Set<string>;
  functionName: string | null;
  afterArrow: boolean;
  lastClosedParams: boolean;
  pendingParams: string[] | null;
  /** The previous identifier was a `type`/`interface`/`enum` declaration name. */
  afterTypeDecl: boolean;
}

export function createState(): HighlightState {
  return {
    contexts: [],
    expectation: Expectation.NONE,
    previousToken: null,
    previousValue: null,
    declarations: new Map(),
    globalParams: new Set(),
    functionName: null,
    afterArrow: false,
    lastClosedParams: false,
    pendingParams: null,
    afterTypeDecl: false,
  };
}

export function pushCtx(ctx: HighlightState, c: Context): void {
  ctx.contexts.push(c);
}

export function popCtx(ctx: HighlightState, kind: ContextKind): Context | null {
  const top = ctx.contexts[ctx.contexts.length - 1];
  if (top && top.kind === kind) return ctx.contexts.pop() ?? null;
  return null;
}
