# Showcase: CoffeeScript — significant whitespace, comprehensions.
VERSION = '0.4.0'

class Span
  constructor: (@start, @end, @kind = 'other') ->

  width: -> @end - @start

  toString: -> "#{@kind}[#{@start}:#{@end}]"

keywords = new Set ['class', 'return', 'if', 'for']

classify = (word) ->
  return 'comment' if word[0] is '#'
  return 'number' if /^\d+$/.test word
  return 'keyword' if keywords.has word
  'other'

highlight = (source) ->
  throw new Error 'empty source' unless source.length
  cache[source] ?= do ->
    toks = []
    off = 0
    for word in source.split /\s+/
      toks.push new Span off, off + word.length, classify word
      off += word.length + 1
    toks

cache = {}

greet = (name = 'world', punct = '!') ->
  "hello, #{name}#{punct}"

squares = (n * n for n in [1..10])
evens = (n for n in squares when n % 2 is 0)
console.log "total=#{evens.reduce (a, b) -> a + b}"

config = theme: 'dark', workers: 4, debug: no
{theme, workers} = config
console.log "#{theme} with #{workers} workers"

users = [
  {name: 'ada', age: 36}
  {name: 'grace', age: 85}
]
adults = (u.name.toUpperCase() for u in users when u.age >= 18)
console.log adults.join '; '

countdown = (n) ->
  return 'done' if n <= 0
  console.log n
  countdown n - 1

countdown 3

result = try
  JSON.parse '{bad'
catch err
  {error: err.message}
finally
  console.log 'parsed.'
