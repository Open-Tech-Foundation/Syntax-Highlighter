# Showcase: fish — friendly interactive shell scripting.
set -g VERSION 0.4.0

function log --argument-names level
    set -l stamp (date '+%H:%M:%S')
    printf '[%s] %s: %s\n' $stamp $level "$argv" >&2
end

function die
    log ERROR $argv
    return 1
end

function highlight --description 'Tokenize a file'
    argparse 'l/lang=' 't/theme=' 'h/help' -- $argv
    or return

    if set -q _flag_help
        echo "Usage: highlight FILE"
        return 0
    end

    set -l lang $_flag_lang
    set -l file $argv[1]
    test -f $file; or die "not a file: $file"

    head -c 1048576 $file
end

set -l fruits apple banana cherry
echo "Available: $fruits ($(count $fruits) total)"
for fruit in $fruits
    echo " - "(string upper $fruit)" ($fruit chars: "(string length $fruit)")"
end

if command -q node
    node --version
else if command -q deno
    deno --version
else
    log WARN "no JS runtime found"
end

switch $TERM
    case 'xterm*'
        echo "fancy terminal"
    case 'dumb'
        echo "plain output"
    case '*'
        echo "unknown: $TERM"
end

set -l i 0
while test $i -lt 3
    echo "pass "(math $i + 1)"/3"
    set i (math $i + 1)
end

echo "user=$USER home=$HOME" | string split ' ' | string join ','
string match -r '^(?<user>[^@]+)@' 'ada@example.com'

abbr -a gs git status
bind \cg 'echo hi'
