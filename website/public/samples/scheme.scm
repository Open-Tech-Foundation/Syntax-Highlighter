;; Showcase: Scheme — closures, macros, and continuations.
(import (scheme base) (scheme write) (scheme case-lambda))

(define version "0.4.0")

(define-record-type <span>
  (make-span start end kind)
  span?
  (start span-start)
  (end span-end)
  (kind span-kind))

(define (span-width s)
  (- (span-end s) (span-start s)))

(define keywords '("define" "lambda" "if" "let" "cond"))

(define (classify word)
  (cond
    ((char=? (string-ref word 0) #\;) 'comment)
    ((string->number word) 'number)
    ((member word keywords) 'keyword)
    (else 'other)))

(define (highlight source)
  (unless (positive? (string-length source))
    (error "empty source"))
  (let loop ((words (string-split source #\space)) (off 0) (acc '()))
    (if (null? words)
        (reverse acc)
        (let* ((w (car words))
               (s (make-span off (+ off (string-length w)) (classify w))))
          (loop (cdr words) (+ off (string-length w) 1) (cons s acc))))))

(define summarize
  (case-lambda
    ((spans) (summarize spans >))
    ((spans less?)
     (sort
      (map (lambda (g) (cons (car g) (length g)))
           (group-by span-kind spans))
      (lambda (a b) (less? (cdr a) (cdr b)))))))

(define-syntax timed
  (syntax-rules ()
    ((_ label body ...)
     (let ((t0 (current-second)))
       (let ((result (begin body ...)))
         (display label) (display ": ")
         (display (- (current-second) t0)) (newline)
         result)))))

(define counter
  (let ((n 0))
    (lambda ()
      (set! n (+ n 1))
      n)))

(define (demo)
  (timed "highlight"
    (let ((toks (highlight "define (f x) (+ x 1)")))
      (display (length toks)) (display " tokens") (newline)
      (for-each (lambda (p)
                  (display (car p)) (display ": ") (display (cdr p)) (newline))
                (summarize toks))))
  (display (map (lambda (n) (* n n)) '(1 2 3))) (newline)
  (display (counter)) (newline))

(demo)
