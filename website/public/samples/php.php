<?php
// Showcase: PHP — classes, enums, match, and string interpolation.
declare(strict_types=1);

namespace App\Highlight;

use InvalidArgumentException;
use JsonSerializable;
use PDO;
use PDOException;
use Stringable;

const VERSION = '0.4.0';
const MAX_RETRIES = 3;
const RATIO = 0.75;

/** Token kinds produced by the tokenizer. */
enum Kind: string implements JsonSerializable
{
    case Keyword = 'keyword';
    case Str = 'string';
    case Number = 'number';
    case Comment = 'comment';

    public function label(): string
    {
        return match ($this) {
            self::Keyword => 'KEYWORD',
            self::Str => 'STRING',
            self::Number, self::Comment => strtoupper($this->value),
        };
    }

    public function jsonSerialize(): string
    {
        return $this->value;
    }
}

final class Span implements Stringable
{
    public function __construct(
        public readonly int $start,
        public readonly int $end,
        public readonly Kind $kind = Kind::Keyword,
    ) {
        if ($end <= $start) {
            throw new InvalidArgumentException("empty span [$start, $end)");
        }
    }

    public function width(): int
    {
        return $this->end - $this->start;
    }

    public function __toString(): string
    {
        return "{$this->kind->value}[{$this->start}:{$this->end}]";
    }
}

trait CachesResults
{
    /** @var array<string, array<Span>> */
    private array $cache = [];

    protected function cached(string $key): ?array
    {
        return $this->cache[$key] ?? null;
    }

    protected function remember(string $key, array $value): array
    {
        return $this->cache[$key] = $value;
    }
}

interface Highlighter
{
    public function language(): string;
    /** @return array<Span> */
    public function highlight(string $source): array;
}

class KeywordHighlighter implements Highlighter
{
    use CachesResults;

    /** @var array<string, true> */
    private array $keywords;

    public function __construct(
        private string $language = 'php',
        string ...$keywords,
    ) {
        $this->keywords = array_fill_keys($keywords ?: ['function', 'return', 'if'], true);
    }

    public function language(): string
    {
        return $this->language;
    }

    public function highlight(string $source): array
    {
        if ($source === '') {
            throw new InvalidArgumentException('empty source');
        }
        if ($hit = $this->cached($source)) {
            return $hit;
        }
        $tokens = [];
        foreach (preg_split('/\s+/', $source, -1, PREG_SPLIT_OFFSET_CAPTURE) as [$word, $off]) {
            $kind = isset($this->keywords[$word]) ? Kind::Keyword : Kind::Str;
            $tokens[] = new Span($off, $off + strlen($word), $kind);
        }
        return $this->remember($source, $tokens);
    }
}

function greet(?string $name, string ...$titles): string
{
    $name ??= 'world';
    $prefix = count($titles) > 0 ? implode(' ', $titles) . ' ' : '';
    return "hello, {$prefix}{$name}!";
}

function summarize(array $rows): array
{
    [$first, $second, ...$rest] = array_values($rows) + [null, null];
    return [
        'first' => $first,
        'second' => $second,
        'rest' => $rest,
        'count' => count($rows),
    ];
}

$greet = fn(string $n): string => "hi {$n}";
$squares = array_map(fn(int $n): int => $n ** 2, range(1, 10));
$evens = array_filter($squares, fn(int $n): bool => $n % 2 === 0);
$total = array_reduce($evens, fn(int $c, int $n): int => $c + $n, 0);

$text = <<<EOT
    Heredoc with {$total} interpolated
    across "multiple" lines.
    EOT;

$nowdoc = <<<'EOT'
    No $interpolation here — literal text.
    EOT;

try {
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $pdo->query('SELECT 1 AS one');
    $row = $stmt?->fetch(PDO::FETCH_ASSOC) ?? [];
} catch (PDOException $e) {
    echo "db failed: {$e->getMessage()}\n";
} finally {
    unset($pdo);
}

$status = 200;
$label = match (true) {
    $status >= 200 && $status < 300 => 'ok',
    $status >= 400 => 'error',
    default => 'unknown',
};

$map = ['a' => 1, 'b' => 2];
foreach ($map as $key => $value) {
    echo "{$key}={$value}\n";
}

for ($i = 0; $i < 3; $i++) {
    if ($i === 1) {
        continue;
    }
    echo $i . PHP_EOL;
}

$numbers = [3, 1, 2];
sort($numbers);
echo implode(',', $numbers) . "\n";
echo __FILE__ . ':' . __LINE__ . "\n";
