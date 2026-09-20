// Showcase: V — structs, results, and channels.
module main

import net.http
import time

const version = '0.4.0'
const max_retries = 3

enum Kind {
	keyword
	string
	number
	other
}

struct Span {
	start int
	end   int
	kind  Kind = .other
}

fn (s Span) width() int {
	return s.end - s.start
}

fn (s Span) str() string {
	return '${s.kind}[$s.start:$s.end]'
}

interface Highlighter {
	language string
	highlight(source string) ![]Span
}

struct KeywordHighlighter {
	language string = 'v'
	keywords map[string]bool
mut:
	cache map[string][]Span
}

fn new_highlighter() KeywordHighlighter {
	return KeywordHighlighter{
		keywords: {
			'fn':    true
			'return': true
			'if':    true
		}
	}
}

fn (mut h KeywordHighlighter) highlight(source string) ![]Span {
	if source.len == 0 {
		return error('empty source')
	}
	if source in h.cache {
		return h.cache[source]
	}
	mut toks := []Span{}
	mut off := 0
	for word in source.split(' ') {
		kind := if word in h.keywords { Kind.keyword } else { Kind.other }
		toks << Span{start: off, end: off + word.len, kind: kind}
		off += word.len + 1
	}
	h.cache[source] = toks
	return toks
}

fn fetch_status(url string) !int {
	mut last_err := error('never tried')
	for attempt in 1 .. max_retries + 1 {
		resp := http.get(url) or {
			last_err = err
			time.sleep(100 * time.millisecond)
			continue
		}
		defer {
			println('fetched')
		}
		return resp.status_code
	}
	return last_err
}

fn main() {
	mut h := new_highlighter()
	toks := h.highlight('fn main return 0')!
	println('${toks.len} tokens')

	ch := chan int{cap: 3}
	go fn() {
		ch <- 40 + 2
	}()
	println(<-ch)

	nums := [3, 1, 2]
	total := nums.filter(it > 1).map(it * 2).sum()
	println(total)
}
