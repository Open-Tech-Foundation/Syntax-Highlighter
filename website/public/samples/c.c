/* Showcase: C — structs, pointers, memory, and function tables. */
#include <ctype.h>
#include <errno.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define VERSION "0.4.0"
#define MAX_RETRIES 3
#define BUFFER_SIZE 4096
#define FLAG_MASK 0xFFu
#define RATIO 0.75
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define ARRAY_LEN(xs) (sizeof(xs) / sizeof((xs)[0]))

typedef enum {
    TOK_KEYWORD,
    TOK_STRING,
    TOK_NUMBER,
    TOK_COMMENT,
    TOK_OTHER
} token_kind_t;

typedef struct {
    token_kind_t kind;
    size_t start;
    size_t end;
} token_t;

typedef struct {
    token_t *items;
    size_t len;
    size_t cap;
} token_vec_t;

typedef struct {
    const char *language;
    const char **keywords;
    size_t n_keywords;
    token_vec_t cache;
    unsigned long hits;
    unsigned long misses;
} highlighter_t;

static const char *KEYWORDS[] = {
    "int", "return", "if", "else", "for", "while", "struct", "typedef"
};

static const char *kind_name(token_kind_t kind) {
    switch (kind) {
    case TOK_KEYWORD: return "keyword";
    case TOK_STRING: return "string";
    case TOK_NUMBER: return "number";
    case TOK_COMMENT: return "comment";
    default: return "other";
    }
}

static bool vec_push(token_vec_t *vec, token_t tok) {
    if (vec->len == vec->cap) {
        size_t cap = vec->cap == 0 ? 16 : vec->cap * 2;
        token_t *items = realloc(vec->items, cap * sizeof(token_t));
        if (items == NULL) {
            return false;
        }
        vec->items = items;
        vec->cap = cap;
    }
    vec->items[vec->len++] = tok;
    return true;
}

static void vec_free(token_vec_t *vec) {
    free(vec->items);
    vec->items = NULL;
    vec->len = vec->cap = 0;
}

static bool is_keyword(const highlighter_t *hl, const char *word, size_t n) {
    for (size_t i = 0; i < hl->n_keywords; i++) {
        if (strlen(hl->keywords[i]) == n && memcmp(hl->keywords[i], word, n) == 0) {
            return true;
        }
    }
    return false;
}

/* Classify one word; returns bytes consumed. */
static size_t classify_word(
    const highlighter_t *hl, const char *src, size_t pos, token_vec_t *out) {
    size_t i = pos;
    while (isalnum((unsigned char)src[i]) || src[i] == '_') {
        i++;
    }
    token_kind_t kind = is_keyword(hl, src + pos, i - pos) ? TOK_KEYWORD : TOK_OTHER;
    token_t tok = {.kind = kind, .start = pos, .end = i};
    if (!vec_push(out, tok)) {
        fprintf(stderr, "out of memory\n");
        exit(EXIT_FAILURE);
    }
    return i - pos;
}

static int highlight(highlighter_t *hl, const char *source, token_vec_t *out) {
    if (source == NULL) {
        errno = EINVAL;
        return -1;
    }
    size_t pos = 0;
    while (source[pos] != '\0') {
        if (isspace((unsigned char)source[pos])) {
            pos++;
        } else if (source[pos] == '/' && source[pos + 1] == '/') {
            size_t end = pos;
            while (source[end] != '\0' && source[end] != '\n') {
                end++;
            }
            token_t tok = {.kind = TOK_COMMENT, .start = pos, .end = end};
            if (!vec_push(out, tok)) {
                return -1;
            }
            pos = end;
        } else {
            pos += classify_word(hl, source, pos, out);
        }
    }
    return 0;
}

typedef int (*operation_t)(int, int);

static int add(int a, int b) { return a + b; }
static int mul(int a, int b) { return a * b; }

struct config {
    char theme[32];
    int workers;
    bool verbose;
};

union value {
    int i;
    double d;
    const char *s;
};

int main(int argc, char **argv) {
    const char *lang = argc > 1 ? argv[1] : "c";
    highlighter_t hl = {
        .language = lang,
        .keywords = KEYWORDS,
        .n_keywords = ARRAY_LEN(KEYWORDS),
        .cache = {0},
        .hits = 0,
        .misses = 0,
    };

    struct config cfg = {.theme = "one-dark", .workers = 4, .verbose = false};
    printf("theme=%s workers=%d\n", cfg.theme, cfg.workers);

    operation_t ops[] = {add, mul};
    for (size_t i = 0; i < ARRAY_LEN(ops); i++) {
        printf("op[%zu](6, 7) = %d\n", i, ops[i](6, 7));
    }

    union value v = {.d = 3.14};
    printf("double=%f int-view=%d\n", v.d, v.i);

    char *copy = malloc(64);
    if (copy == NULL) {
        perror("malloc");
        return EXIT_FAILURE;
    }
    snprintf(copy, 64, "answer=%d", 40 + 2);
    puts(copy);
    free(copy);
    copy = NULL;

    FILE *fp = fopen("input.txt", "r");
    if (fp != NULL) {
        char buf[BUFFER_SIZE];
        while (fgets(buf, sizeof buf, fp) != NULL) {
            fputs(buf, stdout);
        }
        fclose(fp);
    } else {
        perror("input.txt");
    }

    token_vec_t out = {0};
    if (highlight(&hl, "int main return 0", &out) == 0) {
        for (size_t i = 0; i < out.len; i++) {
            printf("%s [%zu:%zu]\n",
                kind_name(out.items[i].kind), out.items[i].start, out.items[i].end);
        }
    }
    vec_free(&out);
    return EXIT_SUCCESS;
}
