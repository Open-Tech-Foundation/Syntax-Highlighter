# Showcase: Python — typing, decorators, async, and data tools.
"""Highlight demo: token statistics for a source file."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from enum import Enum, auto
from functools import lru_cache, wraps
from pathlib import Path
from typing import Any, Generic, ParamSpec, Protocol, TypeVar

VERSION = "1.4.0"
MAX_LINE_LENGTH = 100
HEX_MASK = 0xFF
RATE = 2.5e-3
PI = 3.14159
DEBUG = False
PLACEHOLDER = None

T = TypeVar("T")
P = ParamSpec("P")


class Kind(Enum):
    KEYWORD = auto()
    STRING = auto()
    NUMBER = auto()
    COMMENT = auto()
    OTHER = auto()


@dataclass(frozen=True)
class Span:
    start: int
    end: int
    kind: Kind = Kind.OTHER

    @property
    def width(self) -> int:
        return self.end - self.start

    def __contains__(self, offset: int) -> bool:
        return self.start <= offset < self.end


@dataclass
class Report:
    path: Path
    counts: Counter = field(default_factory=Counter)
    lines: int = 0


class Tokenizer(Protocol):
    def tokenize(self, source: str) -> list[Span]: ...


def timed(func):
    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs):
        import time

        started = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed = time.perf_counter() - started
            print(f"{func.__name__} took {elapsed:.3f}s", file=sys.stderr)

    return wrapper


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    """Clamp value into [low, high]."""
    return max(low, min(high, value))


@lru_cache(maxsize=128)
def word_kind(word: str) -> Kind:
    if word in {"def", "class", "return", "import", "for", "if"}:
        return Kind.KEYWORD
    if re.fullmatch(r"\d+(\.\d+)?", word or ""):
        return Kind.NUMBER
    return Kind.OTHER


def analyze(source: str) -> Report:
    counts: Counter[str] = Counter()
    words = re.findall(r"[A-Za-z_]\w*|\d+\.\d+|\d+|#[^\n]*", source)
    for word in words:
        if word.startswith("#"):
            counts["comment"] += 1
        else:
            counts[word_kind(word).name.lower()] += 1
    report = Report(path=Path("<memory>"), lines=source.count("\n") + 1)
    report.counts.update(counts)
    return report


def summarize(paths: list[Path], *, verbose: bool = False) -> dict[str, Any]:
    totals: defaultdict[str, int] = defaultdict(int)
    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            print(f"skip {path}: {exc}", file=sys.stderr)
            continue
        else:
            rep = analyze(text)
            for key, value in rep.counts.items():
                totals[key] += value
            if verbose:
                print(f"{path}: {rep.lines} lines")
    return dict(totals)


async def fetch_text(session, url: str) -> str:
    async with session.get(url) as response:
        response.raise_for_status()
        return await response.text()


async def gather_all(urls: list[str]) -> list[str]:
    import aiohttp

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_text(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, str)]


def squares(n: int):
    for i in range(n):
        yield i * i


def pairs(items: list[T]) -> Generic[T]:
    raise NotImplementedError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Token statistics")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--top", type=int, default=10)
    args = parser.parse_args(argv)

    totals = summarize(args.paths, verbose=True)
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[: args.top]

    match args.json:
        case True:
            print(json.dumps(dict(ranked), indent=2))
        case False:
            for name, count in ranked:
                bar = "#" * clamp(count / 10, 0, 40)
                print(f"{name:>12} {count:5d} {bar}")

    message = f"v{VERSION} analyzed {len(args.paths)} file(s)"
    print(message.upper() if DEBUG else message.lower())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
