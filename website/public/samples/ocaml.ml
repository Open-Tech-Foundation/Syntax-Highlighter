(* Showcase: OCaml — variants, pattern matching, functors. *)
open Printf

let version = "0.4.0"

type kind = Keyword | String | Number | Comment | Other

type span = { start : int; end : int; kind : kind }

let width s = s.end - s.start
let contains s off = off >= s.start && off < s.end

module StringSet = Set.Make (String)

let keywords = StringSet.of_list ["let"; "match"; "with"; "fun"; "type"]

let classify word =
  if String.length word > 0 && word.[0] = '#' then Comment
  else if StringSet.mem word keywords then Keyword
  else if String.for_all (function '0' .. '9' -> true | _ -> false) word then Number
  else Other

let highlight source =
  if source = "" then invalid_arg "empty source"
  else
    let words = String.split_on_char ' ' source in
    let _, spans =
      List.fold_left
        (fun (off, acc) w ->
          let s = { start = off; end = off + String.length w; kind = classify w } in
          (off + String.length w + 1, s :: acc))
        (0, []) words
    in
    List.rev spans

type 'a result = Ok of 'a | Err of string

let ( >>= ) m f =
  match m with
  | Ok x -> f x
  | Err e -> Err e

let parse_int s =
  try Ok (int_of_string s) with Failure _ -> Err ("not an int: " ^ s)

type shape =
  | Circle of float
  | Rect of float * float
  | Point

let area = function
  | Circle r -> Float.pi *. r *. r
  | Rect (w, h) -> w *. h
  | Point -> 0.

module type STORE = sig
  type t
  val empty : t
  val add : string -> t -> t
end

module ListStore : STORE with type t = string list = struct
  type t = string list
  let empty = []
  let add x xs = x :: xs
end

let () =
  let toks = highlight "let answer = 42" in
  printf "%d tokens\n" (List.length toks);
  let nums = [ 3; 1; 2 ] in
  let total = List.fold_left ( + ) 0 (List.map (fun n -> n * 2) nums) in
  printf "total=%d\n" total;
  (match parse_int "42" >>= fun a -> parse_int "7" >>= fun b -> Ok (a + b) with
  | Ok n -> printf "sum=%d\n" n
  | Err e -> printf "error: %s\n" e);
  print_endline (match area (Circle 2.) with x -> "area=" ^ string_of_float x)
