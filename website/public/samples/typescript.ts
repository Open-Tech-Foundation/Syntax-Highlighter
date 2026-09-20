// Showcase: TypeScript — types, generics, decorators, and modules.
import type { Token } from "./tokens.js";
import { EventEmitter } from "node:events";

export type ThemeMode = "light" | "dark" | "system";
export type TokenKind = Token["type"];
export type Predicate<T> = (value: T, index: number) => boolean;

export interface HighlightOptions {
  readonly language?: string;
  debounceMs?: number;
  onTokens?: (tokens: readonly Token[]) => void;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  next?: string | null;
}

export const enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

export enum Status {
  Idle = "idle",
  Working = "working",
  Done = "done",
}

// Generic function with constraints and defaults.
export function groupBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

// Conditional and mapped types.
export type Flatten<T> = T extends Array<infer U> ? U : T;
export type Flags<T> = { [K in keyof T as `is${Capitalize<string & K>}`]: boolean };
export type Handler<E extends string> = `on${Capitalize<E>}`;

// Function overloads.
export function parse(source: string): Token[];
export function parse(source: string, reviver: (t: Token) => Token): Token[];
export function parse(source: string, reviver?: (t: Token) => Token): Token[] {
  const tokens = JSON.parse(source) as Token[];
  return reviver ? tokens.map(reviver) : tokens;
}

// Abstract classes, implements, parameter properties, and accessors.
export abstract class Renderer<T = string> {
  protected abstract readonly kind: string;

  constructor(
    protected prefix = "sh-",
    public readonly emitter = new EventEmitter(),
  ) {}

  abstract render(source: string, tokens: readonly Token[]): T;

  get label(): string {
    return `${this.kind} renderer`;
  }
}

export class HtmlRenderer extends Renderer<string> implements Disposable {
  protected readonly kind = "html";

  #disposed = false;

  render(source: string, tokens: readonly Token[]): string {
    if (this.#disposed) throw new Error("renderer disposed");
    return tokens
      .map((t) => `<span class="${this.prefix}${t.type}">${source.slice(t.start, t.end)}</span>`)
      .join("");
  }

  [Symbol.dispose](): void {
    this.#disposed = true;
    this.emitter.removeAllListeners();
  }
}

// Satisfies operator and `as const` narrowing.
const palette = {
  dark: { bg: "#0b1120", fg: "#e2e8f0" },
  light: { bg: "#ffffff", fg: "#0f172a" },
} as const satisfies Record<ThemeMode & ("light" | "dark"), { bg: string; fg: string }>;

// Discriminated unions with exhaustive narrowing.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "point" };

export function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rect":
      return shape.width * shape.height;
    case "point":
      return 0;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

// Decorators (TC39) on classes, methods, and fields.
function logged<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    console.time(name);
    try {
      return target.call(this, ...args);
    } finally {
      console.timeEnd(name);
    }
  };
}

class Service {
  @logged
  async fetchStatus(id: number): Promise<Status> {
    const res = await fetch(`/api/status/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Status;
  }
}

// Namespaces, module augmentation, and declaration merging.
namespace Validation {
  export interface Rule {
    test(value: unknown): boolean;
    message: string;
  }

  export function run(value: unknown, rules: Rule[]): string[] {
    return rules.filter((r) => !r.test(value)).map((r) => r.message);
  }
}

interface User {
  name: string;
}
interface User {
  age: number;
}

// Utility types and template literal types.
export type PartialUser = Partial<User>;
export type ReadonlyUser = Readonly<User>;
export type Route = `/docs/${string}` | `/api/${string}`;
export type AwaitedValue<T> = T extends Promise<infer U> ? U : T;

// Non-null assertions, definite assignment, and type guards.
let cached!: Map<string, Token[]>;
export function isToken(value: unknown): value is Token {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Token).start === "number" &&
    typeof (value as Token).end === "number"
  );
}

export function assertDefined<T>(value: T | undefined | null, name: string): asserts value is T {
  if (value === undefined || value === null) throw new Error(`${name} is not defined`);
}

// Control flow with typed catch and generics in JSX-free TS.
export async function load<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    return (await res.json()) as T;
  } catch (err: unknown) {
    console.warn("load failed:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

export default HtmlRenderer;
