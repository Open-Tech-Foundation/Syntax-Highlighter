;; Showcase: Clojure — immutable data, threading, multimethods.
(ns highlight.demo
  (:require [clojure.string :as str]
            [clojure.set :as set]))

(def version "0.4.0")

(defrecord Span [start end kind])

(defn width [{:keys [start end]}]
  (- end start))

(defn contains? [{:keys [start end]} offset]
  (and (>= offset start) (< offset end)))

(def keywords #{"defn" "let" "if" "do" "fn"})

(defn classify [word]
  (cond
    (str/starts-with? word ";") :comment
    (str/starts-with? word "\"") :string
    (re-matches #"\d+" word) :number
    (contains? keywords word) :keyword
    :else :other))

(defn highlight [source]
  (when (str/blank? source)
    (throw (ex-info "empty source" {:source source})))
  (loop [words (str/split source #"\s+") offset 0 acc []]
    (if (empty? words)
      acc
      (let [w (first words)]
        (recur (rest words)
               (+ offset (count w) 1)
               (conj acc (->Span offset (+ offset (count w)) (classify w))))))))

(defn summarize [spans]
  (->> spans
       (group-by :kind)
       (map (fn [[k v]] [k (count v)]))
       (sort-by second >)))

(defmulti area :kind)
(defmethod area :circle [{:keys [r]}] (* Math/PI r r))
(defmethod area :rect [{:keys [w h]}] (* w h))
(defmethod area :default [_] 0)

(defn fib
  ([n] (fib n 0 1))
  ([n a b]
   (lazy-seq
    (when (pos? n)
      (cons a (fib (dec n) b (+ a b)))))))

(def state (atom {}))
(swap! state assoc :runs 1)
(add-watch state :log
  (fn [_ _ old new] (println "changed" old "->" new)))

(def never (delay (println "evaluated!")))

(defn -main [& args]
  (let [toks (highlight "defn foo [x] (+ x 1)")]
    (println (count toks) "tokens")
    (doseq [[k n] (summarize toks)]
      (println (str k ": " n))))
  (println (take 8 (fib 8)))
  (println (area {:kind :circle :r 2.0}))
  (let [f (future (Thread/sleep 50) :done)]
    (println @f)))
