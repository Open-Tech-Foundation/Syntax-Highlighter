# Showcase: Raku — grammars, junctions, hyperoperators.
use v6;

constant VERSION = "0.4.0";

enum Kind <keyword string number other>;

class Span {
    has Int $.start;
    has Int $.finish;
    has Kind $.kind = other;

    method width { $!finish - $!start }
    method Str { "$!kind()[$!start():$!finish()]" }
}

my %keywords = <sub return if for>.map(* => True);

sub classify(Str $word --> Kind) {
    return comment if $word.starts-with("#");
    return number if $word ~~ /^ \d+ ['.' \d+]? $/;
    return keyword if %keywords{$word}:exists;
    other
}

sub highlight(Str $source --> Array) {
    die "empty source" unless $source.chars;
    state %cache;
    return %cache{$source} if %cache{$source}:exists;
    my @toks;
    my $off = 0;
    for $source.words -> $word {
        @toks.push: Span.new(:$off, :finish($off + $word.chars), :kind(classify($word)));
        $off += $word.chars + 1;
    }
    %cache{$source} = @toks;
}

sub greet($name = "world", :$punct = "!") {
    "hello, $name$punct"
}

my @squares = (1..10).map: * ** 2;
say "total=" ~ @squares.grep(* %% 2).sum;

my $age = 36;
say "adult" if 18 <= $age <= 150;
say "match" if $age == any(36, 85);

my @a = <3 1 2>;
my @doubled = @a »*» 2;
say @doubled;

grammar Greeting {
    token TOP { "hello" \h+ <name> "!" }
    token name { \w+ }
}

if Greeting.parse("hello ada!") -> $/ {
    say "hi " ~ $/<name>;
}

react {
    whenever Promise.in(0.05) { say "tick"; done }
}
