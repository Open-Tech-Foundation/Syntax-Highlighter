// Showcase: C# — LINQ, async, records, and pattern matching.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace HighlightDemo;

public enum Kind
{
    Keyword,
    String,
    Number,
    Comment,
    Other
}

public readonly record struct Span(int Start, int End, Kind Kind = Kind.Other)
{
    public int Width => End - Start;
    public bool Contains(int offset) => offset >= Start && offset < End;
    public override string ToString() => $"{Kind}[{Start}:{End}]";
}

public record User(int Id, string Name, int? Age = null)
{
    public string Display => $"{Name} ({Age?.ToString() ?? "n/a"})";
}

public interface IHighlighter
{
    string Language { get; }
    IReadOnlyList<Span> Highlight(string source);
}

public abstract class HighlighterBase : IHighlighter, IDisposable
{
    private readonly Dictionary<string, IReadOnlyList<Span>> _cache = new();
    private bool _disposed;

    protected HighlighterBase(string language) => Language = language;

    public string Language { get; }

    public IReadOnlyList<Span> Highlight(string source)
    {
        ArgumentException.ThrowIfNullOrEmpty(source);
        ObjectDisposedException.ThrowIf(_disposed, this);
        if (_cache.TryGetValue(source, out var hit))
        {
            return hit;
        }
        var tokens = Tokenize(source);
        _cache[source] = tokens;
        return tokens;
    }

    protected abstract IReadOnlyList<Span> Tokenize(string source);

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _cache.Clear();
        }
        _disposed = true;
    }
}

public sealed class KeywordHighlighter : HighlighterBase
{
    private static readonly HashSet<string> Keywords = new(StringComparer.Ordinal)
    {
        "class", "return", "if", "foreach", "await"
    };

    public KeywordHighlighter(string language = "csharp") : base(language) { }

    protected override IReadOnlyList<Span> Tokenize(string source)
    {
        var spans = new List<Span>();
        var words = source.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        var offset = 0;
        foreach (var word in words)
        {
            var kind = Keywords.Contains(word) ? Kind.Keyword
                : word.StartsWith('"') ? Kind.String
                : int.TryParse(word, out _) ? Kind.Number
                : Kind.Other;
            spans.Add(new Span(offset, offset + word.Length, kind));
            offset += word.Length + 1;
        }
        return spans;
    }
}

public static class Extensions
{
    public static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> source) where T : class
        => source.Where(x => x is not null)!;

    public static string ToCsv<T>(this IEnumerable<T> source, string separator = ",")
        => string.Join(separator, source);
}

public static class Program
{
    private const string Version = "0.4.0";
    private const int MaxRetries = 3;

    public static async Task<int> Main(string[] args)
    {
        var highlighter = new KeywordHighlighter();
        var tokens = highlighter.Highlight("class Program return 0");
        Console.WriteLine($"tokens: {tokens.Count}");

        var users = new List<User>
        {
            new(1, "Ada", 36),
            new(2, "Grace", 85),
            new(3, "Alan", null),
        };

        var query = users
            .Where(u => u.Age is not null)
            .OrderByDescending(u => u.Age)
            .Select(u => u with { Name = u.Name.ToUpperInvariant() })
            .ToList();

        var total = query.Sum(u => u.Age ?? 0);
        var names = query.Select(u => u.Name).ToCsv("; ");
        Console.WriteLine($"{names} => {total}");

        var lookup = users.ToDictionary(u => u.Id);
        var groups = users.GroupBy(u => u.Age is null ? "unknown" : "known");
        foreach (var (key, group) in groups.Select(g => (g.Key, g.ToList())))
        {
            Console.WriteLine($"{key}: {group.Count}");
        }

        object shape = (Radius: 2.5);
        var area = shape switch
        {
            (double r,) when r > 0 => Math.PI * r * r,
            null => throw new ArgumentNullException(nameof(shape)),
            _ => 0.0,
        };
        Console.WriteLine($"area={area:F2}");

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        try
        {
            var status = await FetchStatusAsync("https://example.com", cts.Token);
            Console.WriteLine($"status={status}");
        }
        catch (HttpRequestException ex)
        {
            Console.Error.WriteLine($"request failed: {ex.Message}");
            return 1;
        }

        var options = new JsonSerializerOptions { WriteIndented = true };
        var json = JsonSerializer.Serialize(users, options);
        await File.WriteAllTextAsync("users.json", json, cts.Token);

        string? maybe = args.Length > 0 ? args[0] : null;
        Console.WriteLine(maybe ?? "no args");
        return 0;
    }

    private static async Task<int> FetchStatusAsync(string url, CancellationToken token)
    {
        using var client = new HttpClient();
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var response = await client.GetAsync(url, token);
                return (int)response.StatusCode;
            }
            catch when (attempt < MaxRetries)
            {
                await Task.Delay(100 * attempt, token);
            }
        }
    }
}
