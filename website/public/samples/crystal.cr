# Showcase: Crystal — macros, fibers, type inference.
require "json"
require "http/client"

VERSION = "0.4.0"

enum Kind
  Keyword
  String
  Number
  Other
end

record Span, start : Int32, finish : Int32, kind : Kind = :other do
  def width
    finish - start
  end

  def contains?(offset)
    offset >= start && offset < finish
  end
end

abstract class Highlighter
  abstract def language : String
  abstract def highlight(source : String) : Array(Span)
end

class KeywordHighlighter < Highlighter
  getter language : String = "crystal"

  @keywords = Set{"def", "class", "end", "if"}
  @cache = {} of String => Array(Span)

  def highlight(source : String) : Array(Span)
    raise ArgumentError.new("empty source") if source.empty?
    @cache.fetch(source) do
      toks = [] of Span
      offset = 0
      source.split.each do |word|
        kind = @keywords.includes?(word) ? :keyword : :other
        toks << Span.new(offset, offset + word.size, kind)
        offset += word.size + 1
      end
      @cache[source] = toks
    end
  end
end

macro timed(name, &block)
  t0 = Time.monotonic
  {{block}}
  puts "#{ {{name}} } took #{Time.monotonic - t0}"
end

def greet(name : String? = nil) : String
  "hello, #{name || "world"}!"
end

squares = (1..10).map { |n| n ** 2 }
puts squares.select(&.even?).sum

channel = Channel(Int32).new
spawn do
  sleep 0.01
  channel.send(40 + 2)
end
puts channel.receive

response = HTTP::Client.get("https://example.com") rescue nil
puts response.try(&.status_code) || "offline"

timed("sum") do
  puts (1..100).sum
end

puts({theme: "dark", workers: 4}.to_json)
