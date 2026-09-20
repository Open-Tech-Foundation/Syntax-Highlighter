"Showcase: Smalltalk — live objects and blocks."

Object subclass: #Highlighter
    instanceVariableNames: 'language cache'
    classVariableNames: 'Version'
    package: 'Demo'!

!Highlighter class methodsFor: 'initialization'!
initialize
    Version := '0.4.0'.
    ^ self new! !

!Highlighter methodsFor: 'accessing'!
language
    ^ language ifNil: [ language := 'smalltalk' ]!

language: aString
    language := aString! !

!Highlighter methodsFor: 'highlighting'!
highlight: source
    | toks offset |
    source isEmpty ifTrue: [ self error: 'empty source' ].
    cache ifNil: [ cache := Dictionary new ].
    ^ cache at: source ifAbsentPut: [
        toks := OrderedCollection new.
        offset := 0.
        (source substrings: ' ') do: [ :word |
            toks add: { offset. offset + word size. #other }.
            offset := offset + word size + 1 ].
        toks ]!

summarize: spans
    | counts |
    counts := Dictionary new.
    spans do: [ :span |
        counts at: span third put: ((counts at: span third ifAbsent: [ 0 ]) + 1) ].
    ^ counts associations sorted: [ :a :b | a value > b value ]! !

!Highlighter class methodsFor: 'demo'!
run
    | hl toks total |
    hl := self new.
    toks := hl highlight: 'Object subclass return ^ self'.
    Transcript show: toks size printString; show: ' tokens'; cr.
    total := #(3 1 2) inject: 0 into: [ :sum :n | sum + (n * 2) ].
    Transcript show: total printString; cr.
    1 to: 3 do: [ :i | Transcript show: i printString; space ].
    Transcript cr.
    ^ toks! !

Highlighter run!
