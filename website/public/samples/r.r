# Showcase: R — data frames, S3 methods, vectorization.
VERSION <- "0.4.0"

span <- function(start, end, kind = "other") {
  structure(list(start = start, end = end, kind = kind), class = "span")
}

width.span <- function(s) s$end - s$start
print.span <- function(s, ...) {
  cat(sprintf("%s[%d:%d]\n", s$kind, s$start, s$end))
  invisible(s)
}

keywords <- c("function", "return", "if", "for", "library")

classify <- function(word) {
  if (word %in% keywords) "keyword"
  else if (grepl("^[0-9.]+$", word)) "number"
  else "other"
}

highlight <- function(source) {
  if (!nzchar(source)) stop("empty source")
  words <- strsplit(source, "\\s+")[[1]]
  offsets <- cumsum(c(0, nchar(words) + 1L))
  Map(function(w, o) span(o, o + nchar(w), classify(w)), words, offsets[-length(offsets)])
}

summarize <- function(spans) {
  kinds <- vapply(spans, `[[`, "", "kind")
  sort(table(kinds), decreasing = TRUE)
}

users <- data.frame(
  name = c("ada", "grace", "alan"),
  age = c(36L, 85L, 41L),
  active = c(TRUE, TRUE, FALSE),
  stringsAsFactors = FALSE
)

adults <- subset(users, active & age >= 18)
adults$label <- paste0(adults$name, " (", adults$age, ")")
print(adults[order(-adults$age), ])

total <- sum(vapply(adults$age, function(a) a * 2L, integer(1)))
cat(sprintf("total=%d\n", total))

toks <- highlight("function f(x) return x")
print(summarize(toks))

invisible(lapply(seq_len(3), function(i) cat(i, "")))
