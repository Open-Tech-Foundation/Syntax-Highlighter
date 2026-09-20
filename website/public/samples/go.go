// Showcase: Go — structs, interfaces, goroutines, and generics.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	Version    = "0.4.0"
	maxRetries = 3
	timeout    = 5 * time.Second
	flag       = 0xFF
	ratio      = 0.75
)

var ErrEmpty = errors.New("empty input")

// Token is a typed slice of source text.
type Token struct {
	Type  string `json:"type"`
	Start int    `json:"start"`
	End   int    `json:"end"`
}

func (t Token) Width() int { return t.End - t.Start }
func (t Token) String() string {
	return fmt.Sprintf("%s[%d:%d]", t.Type, t.Start, t.End)
}

// Highlighter is anything that can tokenize source.
type Highlighter interface {
	Highlight(ctx context.Context, source string) ([]Token, error)
	Language() string
}

type keywordHighlighter struct {
	language string
	keywords map[string]struct{}
	once     sync.Once
	mu       sync.Mutex
	cache    map[string][]Token
}

func NewKeywordHighlighter(language string, keywords []string) *keywordHighlighter {
	set := make(map[string]struct{}, len(keywords))
	for _, k := range keywords {
		set[k] = struct{}{}
	}
	return &keywordHighlighter{language: language, keywords: set, cache: make(map[string][]Token)}
}

func (h *keywordHighlighter) Language() string { return h.language }

func (h *keywordHighlighter) Highlight(ctx context.Context, source string) ([]Token, error) {
	if source == "" {
		return nil, ErrEmpty
	}
	h.mu.Lock()
	if toks, ok := h.cache[source]; ok {
		h.mu.Unlock()
		return toks, nil
	}
	h.mu.Unlock()

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	var toks []Token
	for _, word := range strings.Fields(source) {
		typ := "identifier"
		if _, ok := h.keywords[word]; ok {
			typ = "keyword"
		}
		toks = append(toks, Token{Type: typ, Start: 0, End: len(word)})
	}
	return toks, nil
}

// Generic helpers over ordered values.
func Min[T int | int64 | float64 | string](a, b T) T {
	if a < b {
		return a
	}
	return b
}

func Filter[T any](items []T, keep func(T) bool) []T {
	out := items[:0]
	for _, it := range items {
		if keep(it) {
			out = append(out, it)
		}
	}
	return out
}

type job struct {
    id   int
    work string
}

func worker(
    ctx context.Context, w job, jobs <-chan string, results chan<- int, wg *sync.WaitGroup,
) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}
			results <- w.id*1000 + len(job)
		}
	}
}

func fetchStatus(ctx context.Context, url string) (int, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return 0, err
		}
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			defer resp.Body.Close()
			_, _ = io.Copy(io.Discard, resp.Body)
			return resp.StatusCode, nil
		}
		lastErr = err
		time.Sleep(time.Duration(attempt) * 100 * time.Millisecond)
	}
	return 0, fmt.Errorf("fetch %s: %w", url, lastErr)
}

func main() {
	ctx := context.Background()
	h := NewKeywordHighlighter("go", []string{"func", "return", "if", "for", "package"})

	toks, err := h.Highlight(ctx, "func main return")
	if err != nil {
		fmt.Fprintln(os.Stderr, "highlight:", err)
		os.Exit(1)
	}
	raw, _ := json.MarshalIndent(toks, "", "  ")
	fmt.Println(string(raw))

	jobs := make(chan string, 8)
	results := make(chan int, 8)
	var wg sync.WaitGroup
	for i := 1; i <= 3; i++ {
		wg.Add(1)
		go worker(ctx, i, jobs, results, &wg)
	}
	for _, j := range []string{"alpha", "beta", "gamma"} {
		jobs <- j
	}
	close(jobs)
	go func() {
		wg.Wait()
		close(results)
	}()

	nums := []float64{3.5, 1.2, 9.8}
	sort.Float64s(nums)
	fmt.Println("min:", Min(3, 7), "sqrt:", math.Sqrt(2), "sorted:", nums)

	defer fmt.Println("done.")
}
