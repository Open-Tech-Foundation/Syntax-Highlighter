#!/usr/bin/env perl
# Showcase: Perl — regex, references, and CPAN style.
use strict;
use warnings;
use v5.36;
use JSON::PP ();
use List::Util qw(sum any);

use constant {
    VERSION => '0.4.0',
    MAX_RETRIES => 3,
};

package Span {
    sub new {
        my ($class, %args) = @_;
        return bless { start => 0, end => 0, kind => 'other', %args }, $class;
    }
    sub width { $_[0]{end} - $_[0]{start} }
    sub as_string { sprintf '%s[%d:%d]', @{$_[0]}{qw(kind start end)} }
}

my %KEYWORDS = map { $_ => 1 } qw(sub my return if else);

sub classify ($word) {
    return 'comment' if $word =~ /^#/;
    return 'number'  if $word =~ /^\d+(?:\.\d+)?$/;
    return 'keyword' if $KEYWORDS{$word};
    return 'other';
}

sub highlight ($source) {
    die 'empty source' unless length $source;
    state %cache;
    return $cache{$source} if exists $cache{$source};
    my (@toks, $off);
    $off = 0;
    for my $word (split /\s+/, $source) {
        push @toks, Span->new(start => $off, end => $off + length($word), kind => classify($word));
        $off += length($word) + 1;
    }
    return $cache{$source} = \@toks;
}

sub greet ($name = 'world', %opts) {
    my $punct = $opts{punct} // '!';
    return "hello, $name$punct";
}

my @squares = map { $_** 2 } 1 .. 10;
my @evens = grep { $_ % 2 == 0 } @squares;
say 'total=', sum(@evens);

my %config = (theme => 'dark', workers => 4, debug => 0);
while (my ($k, $v) = each %config) {
    say "$k=$v";
}

my $text = do { local $/; <DATA> };
my @addrs = $text =~ /(\w+@[\w.]+)/g;
say for @addrs;

my $json = JSON::PP->new->pretty->encode({ name => 'demo', ok => \1 });
print $json;

__DATA__
Contact ada@example.com or grace@example.com for details.
