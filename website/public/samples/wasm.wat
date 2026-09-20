;; Showcase: WebAssembly text — modules, memories, tables.
(module $demo
  (import "env" "log" (func $log (param i32 i32)))
  (import "env" "memory" (memory 1 4 shared))

  (global $answer (mut i32) (i32.const 0))
  (global $VERSION f64 (f64.const 0.4))

  (memory (export "mem") 2)
  (data (i32.const 16) "hello, world\00")

  (table (export "fns") 2 4 funcref)
  (elem (i32.const 0) $add $mul)

  (type $binop (func (param i32 i32) (result i32)))

  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add)

  (func $mul (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.mul)

  (func $fib (export "fib") (param $n i32) (result i32)
    (if (result i32) (i32.le_s (local.get $n) (i32.const 1))
      (then (local.get $n))
      (else
        (i32.add
          (call $fib (i32.sub (local.get $n) (i32.const 1)))
          (call $fib (i32.sub (local.get $n) (i32.const 2)))))))

  (func $main (export "_start")
    (local $i i32)
    (local.set $i (i32.const 0))
    (block $done
      (loop $tick
        (br_if $done (i32.ge_s (local.get $i) (i32.const 3)))
        (call_indirect (type $binop)
          (i32.const 20) (i32.const 2)
          (local.get $i))
        drop
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $tick)))
    (global.set $answer (i32.const 42)))
)
