# Showcase: Julia — multiple dispatch, macros, broadcasting.
const VERSION = "0.4.0"

@enum Kind keyword string number other

struct Span
    start::Int
    finish::Int
    kind::Kind
end

width(s::Span) = s.finish - s.start
Base.contains(s::Span, off::Integer) = s.start <= off < s.finish

const KEYWORDS = Set(["function", "return", "if", "struct", "for"])

classify(word::AbstractString) =
    word in KEYWORDS ? keyword :
    all(isdigit, word) ? number : other

function highlight(source::AbstractString)
    isempty(source) && throw(ArgumentError("empty source"))
    toks = Span[]
    off = 0
    for word in split(source)
        push!(toks, Span(off, off + length(word), classify(word)))
        off += length(word) + 1
    end
    toks
end

area(shape::Val{:circle}, r) = π * r^2
area(shape::Val{:rect}, w, h) = w * h

macro timed(name, block)
    quote
        local t0 = time_ns()
        $(esc(block))
        @printf("%s took %.3fs\n", $(esc(name)), (time_ns() - t0) / 1e9)
    end
end

function main()
    toks = highlight("function f(x) return x end")
    println("$(length(toks)) tokens")

    nums = [3, 1, 2]
    println(sum(n * 2 for n in nums if n > 1))

    counts = Dict{Kind,Int}()
    for t in toks
        counts[t.kind] = get(counts, t.kind, 0) + 1
    end
    foreach(((k, n),) -> println("$k: $n"), sort(collect(counts), by = last))

    A = [1 2; 3 4]
    println(A .* 2)
    println(A * [1, 1])

    @timed "sleep" sleep(0.01)
end

main()
