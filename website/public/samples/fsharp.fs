// Showcase: F# — discriminated unions, computation expressions.
module Highlight

open System
open System.IO

let version = "0.4.0"

type Kind =
    | Keyword
    | Str
    | Number
    | Comment
    | Other

type Span =
    { Start: int
      End: int
      Kind: Kind }
    member this.Width = this.End - this.Start
    member this.Contains offset = offset >= this.Start && offset < this.End

let keywords = set ["let"; "type"; "match"; "function"; "return"]

let classify (word: string) =
    match word with
    | w when w.StartsWith("//") -> Comment
    | w when w.StartsWith "\"" -> Str
    | w when w |> Seq.forall Char.IsDigit -> Number
    | w when keywords.Contains w -> Keyword
    | _ -> Other

let highlight (source: string) =
    if String.IsNullOrWhiteSpace source then
        invalidArg (nameof source) "empty source"
    else
        source.Split([|' '; '\n'; '\t'|], StringSplitOptions.RemoveEmptyEntries)
        |> Array.fold (fun (offset, acc) word ->
            let span = { Start = offset; End = offset + word.Length; Kind = classify word }
            (offset + word.Length + 1, span :: acc)) (0, [])
        |> snd
        |> List.rev

let summarize spans =
    spans
    |> List.groupBy (fun s -> s.Kind)
    |> List.map (fun (k, v) -> k, v.Length)
    |> List.sortByDescending snd

type Result<'T> =
    | Ok of 'T
    | Err of string

type MaybeBuilder() =
    member _.Bind(x, f) = Option.bind f x
    member _.Return x = Some x

let maybe = MaybeBuilder()

let parsePort (s: string) =
    maybe {
        let! n = match Int32.TryParse s with true, v -> Some v | _ -> None
        let! _ = if n > 0 && n < 65536 then Some () else None
        return n
    }

let (|Even|Odd|) n = if n % 2 = 0 then Even else Odd(n)

[<EntryPoint>]
let main argv =
    let toks = highlight "let answer = 42"
    printfn "%d tokens" toks.Length
    for kind, n in summarize toks do
        printfn "%A: %d" kind n
    let numbers = [ 3; 1; 2 ]
    let total = numbers |> List.filter (fun n -> n > 1) |> List.sumBy ((*) 2)
    printfn "total=%d" total
    match 7 with
    | Even -> printfn "even"
    | Odd v -> printfn "odd %d" v
    async {
        use! _lock = Async.OnCancel(fun () -> printfn "cancelled")
        do! Async.Sleep 10
        return "done"
    }
    |> Async.RunSynchronously
    |> printfn "%s"
    0
