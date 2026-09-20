# Showcase: Nim — templates, concepts, asyncdispatch.
import std/[strutils, sequtils, tables, asyncdispatch, json]

const version = "0.4.0"

type
  Kind = enum kKeyword, kString, kNumber, kOther
  Span = object
    start, finish: int
    kind: Kind

func width(s: Span): int = s.finish - s.start

type
  Highlighter = ref object
    language: string
    cache: Table[string, seq[Span]]

const keywords = ["proc", "return", "if", "type"].toHashSet

func classify(word: string): Kind =
  if word in keywords: kKeyword
  elif word.allCharsInSet(Digits): kNumber
  else: kOther

func highlight(h: Highlighter, source: string): seq[Span] =
  if source.len == 0:
    raise newException(ValueError, "empty source")
  result = h.cache.mgetOrPut(source, @[])
  if result.len > 0: return
  var off = 0
  for word in source.splitWhitespace:
    result.add Span(start: off, finish: off + word.len, kind: classify(word))
    off += word.len + 1

template withTiming(body: untyped): untyped =
  block:
    let t0 = cpuTime()
    body
    echo "took ", cpuTime() - t0, "s"

concept TokenSeq = (seq[Span] or array[3, Span])

func summarize(spans: TokenSeq): CountTable[Kind] =
  result = initCountTable[Kind]()
  for s in spans:
    result.inc(s.kind)

proc fetchAll(urls: seq[string]): Future[seq[string]] {.async.} =
  var out: seq[string] = @[]
  for u in urls:
    await sleepAsync(10)
    out.add("body of " & u)
  return out

when isMainModule:
  let hl = Highlighter(language: "nim")
  let toks = hl.highlight("proc main return 0")
  echo toks.len, " tokens"
  withTiming:
    let nums = @[3, 1, 2]
    echo nums.filterIt(it > 1).mapIt(it * 2).foldl(a + b)
  let cfg = %*{"theme": "dark", "workers": 4}
  echo cfg["theme"].getStr
