# Showcase: Tcl — everything is a string, upvar, coroutines.
package require Tcl 8.6

namespace eval ::highlight {
    variable version "0.4.0"
    variable cache
    array set cache {}

    namespace export highlight summarize
}

proc ::highlight::classify {word} {
    if {[string match "#*" $word]} {
        return comment
    } elseif {[string is integer -strict $word]} {
        return number
    } elseif {$word in {proc return if foreach}} {
        return keyword
    } else {
        return other
    }
}

proc ::highlight::highlight {source} {
    variable cache
    if {$source eq ""} {
        return -code error "empty source"
    }
    if {[info exists cache($source)]} {
        return $cache($source)
    }
    set toks [list]
    set off 0
    foreach word [split $source] {
        lappend toks [list $off [expr {$off + [string length $word]}] [classify $word]]
        incr off [expr {[string length $word] + 1}]
    }
    set cache($source) $toks
}

proc ::highlight::summarize {spans} {
    set counts [dict create]
    foreach span $spans {
        lassign $span s e kind
        dict incr counts $kind
    }
    return $counts
}

proc greet {{name world} {punct !}} {
    return "hello, ${name}${punct}"
}

apply {{x y} {
    return [expr {$x * $x + $y * $y}]
}} 3 4

set squares [lmap n {1 2 3 4 5} {expr {$n ** 2}}]
puts "squares=$squares"

for {set i 0} {$i < 3} {incr i} {
    puts "tick $i"
}

foreach {k v} {theme dark workers 4} {
    puts "$k=$v"
}

coroutine counter apply {{} {
    for {set n 1} {1} {incr n} {
        yield $n
    }
}}

puts [counter]
puts [counter]
rename counter ""

try {
    error "boom"
} on error {msg} {
    puts "caught: $msg"
} finally {
    puts "done."
}
