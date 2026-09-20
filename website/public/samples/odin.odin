// Showcase: Odin — SOA structs, tagged unions, context system.
package demo

import "core:fmt"
import "core:strings"
import "core:time"

VERSION :: "0.4.0"

Kind :: enum { Keyword, String, Number, Other }

Span :: struct {
    start: int,
    end:   int,
    kind:  Kind,
}

span_width :: proc(s: Span) -> int {
    return s.end - s.start
}

Highlighter :: struct {
    language: string,
    keywords: map[string]bool,
    cache:    map[string][dynamic]Span,
}

new_highlighter :: proc(language := "odin", allocator := context.allocator) -> Highlighter {
    return Highlighter{
        language = language,
        keywords = map[string]bool{"proc" = true, "return" = true, "if" = true},
        cache = make(map[string][dynamic]Span, allocator = allocator),
    }
}

highlight :: proc(h: ^Highlighter, source: string) -> ([]Span, bool) {
    if len(source) == 0 {
        return nil, false
    }
    if hit, ok := h.cache[source]; ok {
        return hit[:], true
    }
    toks := make([dynamic]Span, context.temp_allocator)
    off := 0
    for word in strings.split_iterator(&source, " ") {
        kind := Kind.Other
        if word in h.keywords {
            kind = .Keyword
        }
        append(&toks, Span{off, off + len(word), kind})
        off += len(word) + 1
    }
    h.cache[source] = toks
    return toks[:], true
}

Shape :: union {
    Circle,
    Rect,
}

Circle :: struct {
    r: f64,
}

Rect :: struct {
    w, h: f64,
}

area :: proc(s: Shape) -> f64 {
    switch v in s {
    case Circle:
        return 3.14159 * v.r * v.r
    case Rect:
        return v.w * v.h
    }
    return 0
}

main :: proc() {
    h := new_highlighter()
    defer delete(h.cache)
    toks, ok := highlight(&h, "proc main return 0")
    fmt.println(len(toks), "tokens", ok)

    nums := [?]int{3, 1, 2}
    total := 0
    for n in nums {
        total += n * 2
    }
    fmt.println("total=", total)
    fmt.println(area(Circle{r = 2}))
}
