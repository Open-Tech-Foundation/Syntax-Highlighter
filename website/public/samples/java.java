// Showcase: Java — classes, generics, streams, and concurrency.
package org.example.highlight;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/** Counts token kinds across source files. */
public final class TokenCounter {

    public static final String VERSION = "0.4.0";
    private static final int MAX_RETRIES = 3;
    private static final long TIMEOUT_MS = 5_000L;
    private static final double RATIO = 0.75;

    private final Map<String, Long> totals = new ConcurrentHashMap<>();

    public enum Kind {
        KEYWORD, STRING, NUMBER, COMMENT, OTHER
    }

    public record Span(int start, int end, Kind kind) {
        public int width() {
            return end - start;
        }

        public boolean contains(int offset) {
            return offset >= start && offset < end;
        }
    }

    public sealed interface Result permits Result.Ok, Result.Err {
        record Ok(String value) implements Result {}
        record Err(String message) implements Result {}
    }

    private TokenCounter() {
        // utility class — no instances
    }

    public static TokenCounter create() {
        return new TokenCounter();
    }

    /** Tokenize a line into crude word spans. */
    public List<Span> tokenize(String line) {
        var spans = new ArrayList<Span>();
        var matcher = java.util.regex.Pattern.compile("\\w+|\"[^\"]*\"|//.*").matcher(line);
        while (matcher.find()) {
            String word = matcher.group();
            Kind kind = word.startsWith("\"") ? Kind.STRING
                    : word.startsWith("//") ? Kind.COMMENT
                    : word.matches("\\d+") ? Kind.NUMBER
                    : isKeyword(word) ? Kind.KEYWORD : Kind.OTHER;
            spans.add(new Span(matcher.start(), matcher.end(), kind));
        }
        return List.copyOf(spans);
    }

    private static boolean isKeyword(String word) {
        return switch (word) {
            case "class", "public", "static", "return", "new" -> true;
            default -> false;
        };
    }

    /** Count kinds with the streams API. */
    public Map<Kind, Long> countKinds(List<String> lines) {
        return lines.stream()
                .flatMap(line -> tokenize(line).stream())
                .collect(Collectors.groupingBy(Span::kind, Collectors.counting()));
    }

    public <T, R> List<R> transform(List<T> input, Function<? super T, ? extends R> fn) {
        return input.stream().map(fn).toList();
    }

    public Optional<String> readFirstLine(Path path) {
        try {
            return Files.lines(path).findFirst();
        } catch (IOException e) {
            System.err.println("read failed: " + e.getMessage());
            return Optional.empty();
        }
    }

    /** Fan out file reads across a thread pool. */
    public CompletableFuture<Map<String, Long>> countAllAsync(List<Path> paths) {
        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
            List<CompletableFuture<Void>> tasks = paths.stream()
                    .map(path -> CompletableFuture.runAsync(() -> {
                        try {
                            List<String> lines = Files.readAllLines(path);
                            Map<Kind, Long> counts = countKinds(lines);
                            counts.forEach((kind, n) ->
                                    totals.merge(kind.name(), n, Long::sum));
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    }, pool))
                    .toList();
            return CompletableFuture.allOf(tasks.toArray(CompletableFuture[]::new))
                    .thenApply(ignored -> Map.copyOf(totals));
        }
    }

    public static void main(String[] args) throws Exception {
        var counter = TokenCounter.create();
        var started = Instant.now();

        List<Integer> numbers = IntStream.rangeClosed(1, 100)
                .boxed()
                .sorted(Comparator.reverseOrder())
                .toList();
        System.out.printf("max=%d min=%d%n", numbers.get(0), numbers.get(numbers.size() - 1));

        Map<String, Integer> ages = new HashMap<>();
        ages.put("ada", 36);
        ages.putIfAbsent("grace", 85);
        ages.computeIfPresent("ada", (k, v) -> v + 1);
        System.out.println("ages=" + ages);

        String text = """
                SELECT id, name
                FROM users
                WHERE active = TRUE;
                """;
        System.out.println(text.strip().toLowerCase());

        int[] primes = {2, 3, 5, 7, 11};
        for (int i = 0; i < primes.length; i++) {
            if (primes[i] % 2 == 0) {
                continue;
            }
            System.out.println("odd prime: " + primes[i]);
        }

        int code = 200;
        String label = switch (code / 100) {
            case 2 -> "success";
            case 4, 5 -> "failure";
            default -> "other";
        };

        Result result = label.equals("success") ? new Result.Ok("fine") : new Result.Err("bad");
        if (result instanceof Result.Ok ok) {
            System.out.println("ok: " + ok.value());
        }

        Duration elapsed = Duration.between(started, Instant.now());
        System.out.println("done in " + elapsed.toMillis() + "ms");
        assert elapsed.toMillis() >= 0 : "clock moved backwards";
    }
}
