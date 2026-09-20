% Showcase: Prolog — unification, backtracking, DCGs.
:- module(demo, [highlight/2, main/0]).
:- use_module(library(lists)).
:- use_module(library(apply)).

version('0.4.0').

keyword(":-").
keyword("if").
keyword("is").

classify(Word, comment) :- sub_atom(Word, 0, 1, _, '%'), !.
classify(Word, number) :- atom_number(Word, _), !.
classify(Word, keyword) :- keyword(Word), !.
classify(_, other).

highlight(Source, Spans) :-
    Source \== '' ->
        split_string(Source, " ", "", Words),
        highlight_words(Words, 0, Spans)
    ;   throw(error(empty_source)).

highlight_words([], _, []).
highlight_words([W|Ws], Off, [span(Off, End, Kind)|Rest]) :-
    classify(W, Kind),
    string_length(W, Len),
    End is Off + Len,
    Next is End + 1,
    highlight_words(Ws, Next, Rest).

width(span(S, E, _), W) :- W is E - S.

summarize(Spans, Counts) :-
    findall(K, member(span(_, _, K), Spans), Kinds),
    sort(Kinds, Unique),
    findall(K-N, (member(K, Unique), aggregate(count, member(span(_, _, K), Spans), N)), Counts).

sibling(ada, grace).
sibling(grace, alan) :- sibling(ada, grace).

ancestor(X, Y) :- sibling(X, Y).
ancestor(X, Z) :- sibling(X, Y), ancestor(Y, Z).

fib(0, 0) :- !.
fib(1, 1) :- !.
fib(N, F) :-
    N > 1,
    N1 is N - 1, N2 is N - 2,
    fib(N1, F1), fib(N2, F2),
    F is F1 + F2.

greet(Name) -->
    "hello, ", string(Name), "!".

main :-
    highlight("foo :- bar, baz", Spans),
    length(Spans, N),
    format("~d tokens~n", [N]),
    summarize(Spans, Counts),
    maplist(writeln, Counts),
    fib(10, F),
    format("fib=~d~n", [F]),
    phrase(greet("world"), Cs),
    string_codes(S, Cs),
    writeln(S).
