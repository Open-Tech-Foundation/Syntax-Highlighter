# Showcase: Elixir — pattern matching, pipes, OTP basics.
defmodule Highlight.Span do
  @moduledoc "A typed slice of source text."
  @enforce_keys [:start, :finish]
  defstruct [:start, :finish, kind: :other]

  @type kind :: :keyword | :string | :number | :comment | :other
  @type t :: %__MODULE__{start: non_neg_integer(), finish: non_neg_integer(), kind: kind()}

  def width(%__MODULE__{start: s, finish: f}), do: f - s
  def contains?(%__MODULE__{start: s, finish: f}, off), do: off in s..(f - 1)//1
end

defmodule Highlight do
  @keywords ~w[def defmodule do end if else case]a
  @version "0.4.0"

  @spec highlight(String.t()) :: {:ok, [Highlight.Span.t()]} | {:error, String.t()}
  def highlight(""), do: {:error, "empty source"}

  def highlight(source) do
    {spans, _} =
      source
      |> String.split()
      |> Enum.map_reduce(0, fn word, off ->
        kind =
          cond do
            String.starts_with?(word, "#") -> :comment
            String.starts_with?(word, ~s(")) -> :string
            word =~ ~r/^\d+$/ -> :number
            String.to_atom(word) in @keywords -> :keyword
            true -> :other
          end

        {%Highlight.Span{start: off, finish: off + String.length(word), kind: kind},
         off + String.length(word) + 1}
      end)

    {:ok, spans}
  end

  def summarize(spans) do
    spans
    |> Enum.group_by(& &1.kind)
    |> Map.new(fn {k, v} -> {k, length(v)} end)
    |> Enum.sort_by(fn {_, n} -> n end, :desc)
  end
end

defmodule Highlight.Counter do
  use Agent

  def start_link(_), do: Agent.start_link(fn -> %{} end, name: __MODULE__)
  def add(kind), do: Agent.update(__MODULE__, &Map.update(&1, kind, 1, fn n -> n + 1 end))
  def all, do: Agent.get(__MODULE__, & &1)
end

{:ok, spans} = Highlight.highlight("def hello do 42 end")
Highlight.summarize(spans) |> IO.inspect(label: "counts")

receive do
  {:tokens, n} -> IO.puts("#{n} tokens")
after
  100 -> IO.puts("timeout")
end

for n <- 1..5, rem(n, 2) == 1, do: IO.puts("odd #{n}")

with {:ok,_h} <- File.open("demo.ex", [:read]),
     data when is_binary(data) <- IO.read(:stdio, :eof) do
  IO.puts("read #{byte_size(data)} bytes")
end

try do
  raise "boom"
rescue
  e in RuntimeError -> IO.puts("caught: #{Exception.message(e)}")
end
