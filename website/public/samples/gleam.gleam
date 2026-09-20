// Showcase: Gleam — static types, pipes, OTP actors.
import gleam/dict.{type Dict}
import gleam/int
import gleam/io
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import gleam/string

pub type Kind {
  Keyword
  Str
  Number
  Comment
  Other
}

pub type Span {
  Span(start: Int, end: Int, kind: Kind)
}

pub fn width(span: Span) -> Int {
  span.end - span.start
}

pub type HighlightError {
  Empty
  UnknownLanguage(String)
}

pub fn highlight(source: String) -> Result(List(Span), HighlightError) {
  case source {
    "" -> Error(Empty)
    _ -> {
      let words = string.split(source, on: " ")
      let #(spans, _) =
        list.map_fold(words, 0, fn(off, word) {
          let kind = case word {
            "pub" | "fn" | "let" -> Keyword
            _ if string.starts_with(word, "\"") -> Str
            _ ->
              case int.parse(word) {
                Ok(_) -> Number
                Error(_) -> Other
              }
          }
          #(Span(off, off + string.length(word), kind), off + string.length(word) + 1)
        })
      Ok(spans)
    }
  }
}

pub type Msg {
  Add(Kind)
  Get(reply_to: actor.Subject(Dict(Kind, Int)))
}

fn handle(state: Dict(Kind, Int), msg: Msg) -> actor.Next(Dict(Kind, Int), Msg) {
  case msg {
    Add(kind) -> {
      let next = dict.upsert(state, kind, 1, fn(n) { n + 1 })
      actor.continue(next)
    }
    Get(reply_to) -> {
      actor.send(reply_to, state)
      actor.continue(state)
    }
  }
}

pub fn main() {
  let assert Ok(spans) = highlight("pub fn main 42")
  io.println(int.to_string(list.length(spans)) <> " tokens")

  let counts =
    spans
    |> list.group(fn(s) { s.kind })
    |> dict.map_values(fn(_, v) { list.length(v) })

  dict.each(counts, fn(kind, n) {
    io.println(string.inspect(kind) <> ": " <> int.to_string(n))
  })

  let total =
    [3, 1, 2]
    |> list.filter(fn(n) { n > 1 })
    |> list.map(fn(n) { n * 2 })
    |> int.sum

  io.println("total=" <> int.to_string(total))
}
