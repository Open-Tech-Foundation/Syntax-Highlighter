// Showcase: Groovy — builders, closures, and GStrings.
import groovy.json.JsonOutput
import groovy.transform.Canonical
import groovy.transform.Field

@Field def VERSION = '0.4.0'

@Canonical
class Span {
    int start
    int end
    String kind = 'other'

    int getWidth() { end - start }
    boolean contains(int offset) { offset >= start && offset < end }
}

trait Highlighting {
    abstract List<Span> highlight(String source)

    Map<String, Integer> summarize(List<Span> spans) {
        spans.groupBy { it.kind }.collectEntries { k, v -> [k, v.size()] }
    }
}

class KeywordHighlighter implements Highlighting {
    final String language
    private final Set<String> keywords
    private final Map<String, List<Span>> cache = [:].withDefault { [] }

    KeywordHighlighter(String language = 'groovy') {
        this.language = language
        this.keywords = ['def', 'class', 'return', 'if'] as Set
    }

    List<Span> highlight(String source) {
        if (!source?.trim()) throw new IllegalArgumentException('empty source')
        if (cache.containsKey(source)) return cache[source]
        def toks = []
        def offset = 0
        source.split(/\s+/).each { word ->
            def kind = word in keywords ? 'keyword' : 'other'
            toks << new Span(start: offset, end: offset + word.size(), kind: kind)
            offset += word.size() + 1
        }
        cache[source] = toks
    }
}

def greet(String name = 'world', String punct = '!') {
    "hello, ${name}${punct}"
}

def squares = (1..10).collect { it ** 2 }
def evens = squares.findAll { it % 2 == 0 }
println "total=${evens.sum()}"

def config = [theme: 'dark', workers: 4, debug: false]
def (theme, workers) = [config.theme, config.workers]
println "$theme with $workers workers"

['a', 'b', 'a'].countBy { it }.each { k, v -> println "$k x$v" }

def xml = new groovy.xml.MarkupBuilder()
xml.catalog {
    book(id: 'b1') {
        title('Tokens')
    }
}

def json = JsonOutput.toJson([name: 'demo', version: VERSION])
println JsonOutput.prettyPrint(json)

try {
    new URL('https://example.com').text
} catch (IOException e) {
    println "offline: ${e.message}"
} finally {
    println 'done.'
}

5.times { println "tick $it" }
