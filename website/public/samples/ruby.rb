# Showcase: Ruby — classes, blocks, mixins, and metaprogramming.
# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

VERSION = "0.4.0"
MAX_RETRIES = 3
RATIO = 0.75
FLAG = 0xFF
DEFAULT_LANG = :ruby

# Retry helper with exponential backoff.
module Retriable
  def with_retry(retries: MAX_RETRIES)
    attempt = 0
    begin
      yield attempt
    rescue StandardError => e
      attempt += 1
      raise e if attempt >= retries

      sleep(0.1 * (2**attempt))
      retry
    end
  end
end

# Comparable token span with custom ordering.
class Span
  include Comparable
  include Enumerable

  attr_reader :start, :finish, :kind

  def initialize(start, finish, kind = :other)
    raise ArgumentError, "empty span" if finish <= start

    @start = start
    @finish = finish
    @kind = kind
  end

  def width
    @finish - @start
  end

  def <=>(other)
    [@start, @finish] <=> [other.start, other.finish]
  end

  def each(&block)
    (@start...@finish).each(&block)
  end

  def to_s
    "#{@kind}[#{@start}:#{@finish}]"
  end
  alias inspect to_s
end

class Highlighter
  include Retriable

  KEYWORDS = %w[def class end if else return do].freeze
  OPERATORS = %i[+ - * / == != =~ !].freeze

  attr_accessor :language
  attr_reader :cache

  def initialize(language = DEFAULT_LANG)
    @language = language
    @cache = {}
  end

  def highlight(source)
    raise ArgumentError, "expected String" unless source.is_a?(String)
    return @cache[source] if @cache.key?(source)

    tokens = []
    offset = 0
    source.scan(/\w+|"[^"]*"|#[^\n]*/) do |word|
      kind = case word
             when /\A#/ then :comment
             when /\A"/ then :string
             when /\A\d+\z/ then :number
             else KEYWORDS.include?(word) ? :keyword : :identifier
             end
      tokens << Span.new(offset, offset + word.length, kind)
      offset += word.length + 1
    end
    @cache[source] = tokens
  end

  def clear!
    @cache.clear
    self
  end

  def self.supported
    %i[ruby python javascript]
  end

  private

  def secret
    42
  end
end

class HtmlHighlighter < Highlighter
  def initialize(language = DEFAULT_LANG, prefix = "sh-")
    super(language)
    @prefix = prefix
  end

  def render(source, tokens)
    tokens.map do |t|
      %(<span class="#{@prefix}#{t.kind}">#{source[t.start...t.finish]}</span>)
    end.join
  end
end

def greet(name = "world", greeting: "hello", **opts)
  punct = opts.fetch(:punct, "!")
  "#{greeting}, #{name}#{punct}"
end

squares = (1..10).map { |n| n**2 }
evens = squares.select(&:even?)
total = evens.reduce(0, :+)
puts "total=#{total}"

double = ->(n) { n * 2 }
adder = lambda { |a, b| a + b }
puts double.call(21)
puts adder.call(20, 22)

message = <<~TEXT
  Heredoc with #{total} interpolated
  across "quoted" lines.
TEXT

pattern = /(?<user>[^@\s]+)@(?<host>\S+)/i
if (m = "ada@example.com".match(pattern))
  puts "#{m[:user]} at #{m[:host]}"
end

counts = Hash.new(0)
%w[a b a c b a].each { |w| counts[w] += 1 }
puts counts.sort_by { |_, c| -c }.to_h.inspect

config = { theme: "dark", workers: 4, debug: false, ratio: 0.5 }
config => { theme:, workers:, **rest }
puts "#{theme} #{workers} #{rest}"

uri = URI("https://example.com/api")
response = Net::HTTP.get_response(uri)
puts case response.code.to_i
     when 200..299 then "ok"
     when 400..499 then "client error"
     else "other: #{response.code}"
     end

numbers = [3, 1, 2, nil]
numbers.compact!
numbers.sort!
numbers.each_with_index do |n, i|
  next if n.odd?
  puts "#{i}: #{n}"
end

5.times { |i| print "#{i} " }
puts
1.upto(3) { |i| puts "up #{i}" }
3.downto(1) { |i| puts "down #{i}" }

result = begin
  JSON.parse("{bad json")
rescue JSON::ParserError => e
  { error: e.message }
else
  { ok: true }
ensure
  puts "parsed."
end
puts result

puts __FILE__, __LINE__, RUBY_VERSION
puts :symbol, :"interp #{1 + 1}", "frozen".frozen?
