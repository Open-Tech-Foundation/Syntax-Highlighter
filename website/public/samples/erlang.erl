%% Showcase: Erlang — pattern matching, OTP, message passing.
-module(demo).
-export([main/1, highlight/1, counter/0]).

-define(VERSION, "0.4.0").
-define(MAX_RETRIES, 3).

-record(span, {start = 0 :: non_neg_integer(),
               end = 0 :: non_neg_integer(),
               kind = other :: kind()}).

-type kind() :: keyword | string | number | other.
-type span() :: #span{}.

-spec width(span()) -> non_neg_integer().
width(#span{start = S, end = E}) -> E - S.

-spec highlight(binary()) -> {ok, [span()]} | {error, string()}.
highlight(<<>>) -> {error, "empty source"};
highlight(Source) ->
    Words = binary:split(Source, <<" ">>, [global]),
    {Spans, _} = lists:mapfoldl(
        fun(Word, Off) ->
            Kind = case Word of
                <<"def">> -> keyword;
                <<"case">> -> keyword;
                <<C, _/binary>> when C >= $0, C =< $9 -> number;
                _ -> other
            end,
            {#span{start = Off, end = Off + byte_size(Word), kind = Kind},
             Off + byte_size(Word) + 1}
        end, 0, Words),
    {ok, Spans}.

-spec summarize([span()]) -> #{kind() => non_neg_integer()}.
summarize(Spans) ->
    lists:foldl(
        fun(#span{kind = K}, Acc) ->
            maps:update_with(K, fun(N) -> N + 1 end, 1, Acc)
        end, #{}, Spans).

counter() ->
    receive
        {add, Kind, From} ->
            From ! ok,
            counter();
        {get, From} ->
            From ! #{},
            counter();
        stop -> ok
    after 5000 ->
        timeout
    end.

main(Args) ->
    {ok, Toks} = highlight(<<"def hello 42">>),
    io:format("~p tokens~n", [length(Toks)]),
    io:format("~p~n", [summarize(Toks)]),
    Pid = spawn(?MODULE, counter, []),
    Pid ! {add, keyword, self()},
    receive ok -> ok after 1000 -> timeout end,
    [io:format("~p ", [N * 2]) || N <- lists:seq(1, 5)],
    io:nl(),
    case Args of
        [] -> io:format("no args~n");
        [H | T] -> io:format("~s +~p more~n", [H, length(T)])
    end.
