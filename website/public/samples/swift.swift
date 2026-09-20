// Showcase: Swift — optionals, protocols, closures, and concurrency.
import Foundation

let version = "0.4.0"
let maxRetries = 3
let ratio = 0.75
let flag: UInt8 = 0xFF

enum Kind: String, CaseIterable {
    case keyword, string, number, comment, other
}

struct Span: Hashable, CustomStringConvertible {
    var start: Int
    var end: Int
    var kind: Kind = .other

    var width: Int { end - start }
    var description: String { "\(kind)[\(start):\(end)]" }

    func contains(_ offset: Int) -> Bool {
        (start..<end).contains(offset)
    }
}

protocol Highlighter: AnyObject {
    var language: String { get }
    func highlight(_ source: String) throws -> [Span]
}

enum HighlightError: Error, LocalizedError {
    case empty
    case unknownLanguage(String)

    var errorDescription: String? {
        switch self {
        case .empty: return "empty source"
        case .unknownLanguage(let lang): return "unknown language: \(lang)"
        }
    }
}

final class KeywordHighlighter: Highlighter {
    let language: String
    private let keywords: Set<String>
    private var cache: [String: [Span]] = [:]

    init(language: String = "swift") {
        self.language = language
        self.keywords = ["func", "return", "if", "let", "class"]
    }

    func highlight(_ source: String) throws -> [Span] {
        guard !source.isEmpty else { throw HighlightError.empty }
        if let hit = cache[source] { return hit }
        var tokens: [Span] = []
        var offset = 0
        for word in source.split(separator: " ") {
            let kind: Kind = keywords.contains(String(word)) ? .keyword : .other
            tokens.append(Span(start: offset, end: offset + word.count, kind: kind))
            offset += word.count + 1
        }
        cache[source] = tokens
        return tokens
    }
}

extension Array where Element == Span {
    var byKind: [Kind: [Span]] {
        Dictionary(grouping: self, by: \.kind)
    }
}

struct User: Codable, Identifiable, CustomStringConvertible {
    var id: Int
    var name: String
    var age: Int?

    var description: String {
        "\(name) (\(age.map(String.init) ?? "n/a"))"
    }
}

@propertyWrapper
struct Clamped {
    var value: Double
    var range: ClosedRange<Double> = 0...1

    var wrappedValue: Double {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }

    init(wrappedValue: Double, _ range: ClosedRange<Double> = 0...1) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
}

struct Meter {
    @Clamped(0...100) var level: Double = 0
}

// Result builders for a tiny DSL.
@resultBuilder
struct ParagraphBuilder {
    static func buildBlock(_ parts: String...) -> String {
        parts.joined(separator: "\n")
    }
}

func paragraph(@ParagraphBuilder _ content: () -> String) -> String {
    content()
}

let numbers = [3, 1, 2]
let squares = numbers.map { $0 * $0 }.filter { $0 > 2 }
let total = squares.reduce(0, +)
print("total=\(total)")

let scores = ["ada": 98, "grace": 99]
for (name, score) in scores.sorted(by: { $0.value > $1.value }) {
    print("\(name): \(score)")
}

var nickname: String? = nil
let display = nickname ?? "anonymous"
if let name = nickname {
    print("hello, \(name)")
} else {
    print("hello, \(display)")
}

func greet(_ name: String, punct: String = "!") -> String {
    "hello, \(name)\(punct)"
}

func fetchStatus(from url: URL) async throws -> Int {
    var lastError: Error?
    for attempt in 1...maxRetries {
        do {
            let (_, response) = try await URLSession.shared.data(from: url)
            return (response as? HTTPURLResponse)?.statusCode ?? -1
        } catch {
            lastError = error
            try await Task.sleep(nanoseconds: UInt64(attempt) * 100_000_000)
        }
    }
    throw lastError!
}

func countdown() async {
    for await tick in AsyncStream<Int>({ continuation in
        for i in (1...3).reversed() { continuation.yield(i) }
        continuation.finish()
    }) {
        print(tick)
    }
}

let doc = paragraph {
    "First line."
    "Second line with \(total)."
}

defer { print("done.") }
