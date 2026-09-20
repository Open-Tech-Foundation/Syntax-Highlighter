;;; Showcase: Common Lisp — macros, CLOS, and conditions.
(defpackage #:highlight
  (:use #:cl)
  (:export #:highlight #:summarize #:span))

(in-package #:highlight)

(defconstant +version+ "0.4.0")

(defstruct (span (:conc-name s-))
  (start 0 :type fixnum)
  (end 0 :type fixnum)
  (kind :other :type keyword))

(defgeneric width (span)
  (:documentation "Width in code units."))

(defmethod width ((s span))
  (- (s-end s) (s-start s)))

(defparameter *keywords* '("defun" "let" "if" "loop" "return"))

(defun classify (word)
  (cond
    ((char= (char word 0) #\;) :comment)
    ((every #'digit-char-p word) :number)
    ((member word *keywords* :test #'string=) :keyword)
    (t :other)))

(defun highlight (source)
  (assert (plusp (length source)) (source) "empty source: ~S" source)
  (loop with offset = 0
        for word in (uiop:split-string source :separator " ")
        for end = (+ offset (length word))
        collect (make-span :start offset :end end :kind (classify word))
        do (incf offset (1+ (length word)))))

(defun summarize (spans)
  (let ((counts (make-hash-table)))
    (dolist (s spans)
      (incf (gethash (s-kind s) counts 0)))
    (sort (loop for k being each hash-key of counts
                collect (cons k (gethash k counts)))
          #'> :key #'cdr)))

(defmacro with-timing ((&key (label "took")) &body body)
  (let ((t0 (gensym)))
    `(let ((,t0 (get-internal-real-time)))
       (prog1 (progn ,@body)
         (format t "~&~A: ~Fs~%" ,label
                 (/ (- (get-internal-real-time) ,t0)
                    internal-time-units-per-second))))))

(defun demo ()
  (with-timing (:label "highlight")
    (let ((toks (highlight "defun foo (x) (+ x 1)")))
      (format t "~D tokens~%" (length toks))
      (dolist (pair (summarize toks))
        (format t "~A: ~D~%" (car pair) (cdr pair))))))

(handler-case (highlight "")
  (error (e) (format t "caught: ~A~%" e)))
