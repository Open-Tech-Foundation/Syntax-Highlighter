// Showcase: D — templates, ranges, and unittest blocks.
import std.algorithm : filter, map, sum;
import std.array : array;
import std.conv : to;
import std.stdio : writeln, writefln;
import std.string : split;

enum Kind { keyword, str, number, other }

struct Span {
    size_t start;
    size_t end;
    Kind kind = Kind.other;

    @property size_t width() const pure nothrow {
        return end - start;
    }
}

class Highlighter {
    string language;
    private Span[][string] cache;

    this(string language = "d") {
        this.language = language;
    }

    Span[] highlight(string source) {
        if (source.length == 0)
            throw new Exception("empty source");
        if (auto hit = source in cache)
            return *hit;
        Span[] toks;
        size_t off;
        foreach (word; source.split(" ")) {
            auto kind = word == "class" || word == "return" ? Kind.keyword : Kind.other;
            toks ~= Span(off, off + word.length, kind);
            off += word.length + 1;
        }
        return cache[source] = toks;
    }
}

// Generic clamp over any ordered type.
T clamp(T)(T v, T lo, T hi) if (is(typeof(v < lo))) {
    return v < lo ? lo : v > hi ? hi : v;
}

void main(string[] args) {
    auto hl = new Highlighter();
    auto toks = hl.highlight("class Demo return 0");
    writefln!"%d tokens"(toks.length);

    auto nums = [3, 1, 2];
    auto total = nums.filter!(n => n > 1).map!(n => n * 2).sum;
    writeln("total=", total);

    int[string] ages = ["ada": 36, "grace": 85];
    foreach (name, age; ages) {
        switch (age) {
            case 36:
                writeln(name, " is 36");
                break;
            default:
                writeln(name, " is ", age);
                break;
        }
    }

    writeln(clamp(15, 0, 10));
    writeln(clamp("m", "a", "z"));
}

unittest {
    auto s = Span(0, 2);
    assert(s.width == 2);
    assert(clamp(-1, 0, 10) == 0);
}
