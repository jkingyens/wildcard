(module
  ;; Host Imports
  (import "user:sqlite/sqlite" "execute" (func $sqlite_execute (param i32 i32 i32 i32) (result i32)))
  (import "user:sqlite/sqlite" "query" (func $sqlite_query (param i32 i32 i32 i32) (result i32)))
  (import "env" "log" (func $log (param i32 i32)))

  ;; Memory
  (memory (export "memory") 4)

  ;; Allocator (cabi_realloc)
  (global $heap_ptr (mut i32) (i32.const 1024))
  (func (export "cabi_realloc") (param $old_ptr i32) (param $old_size i32) (param $align i32) (param $new_size i32) (result i32)
    (local $ptr i32)
    (local $needed i32)
    (local.set $ptr (global.get $heap_ptr))
    (local.set $ptr 
      (i32.and 
        (i32.add (local.get $ptr) (i32.sub (local.get $align) (i32.const 1))) 
        (i32.xor (i32.add (local.get $align) (i32.const -1)) (i32.const -1))
      )
    )
    (local.set $needed (i32.add (local.get $ptr) (local.get $new_size)))
    (loop $grow_loop
      (if (i32.gt_u (local.get $needed) (i32.mul (memory.size) (i32.const 65536)))
        (then
          (if (i32.eq (memory.grow (i32.const 1)) (i32.const -1)) (then (unreachable)))
          (br $grow_loop)
        )
      )
    )
    (global.set $heap_ptr (local.get $needed))
    (local.get $ptr)
  )

  ;; Constants
  (data (i32.const 0) "verification_results")
  (data (i32.const 20) "CREATE TABLE IF NOT EXISTS test_verification (id INTEGER, val TEXT)")
  (data (i32.const 90) "INSERT INTO test_verification (id, val) VALUES (1, 'hello')")
  (data (i32.const 150) "SELECT * FROM test_verification")
  (data (i32.const 190) "Success!")

  (func (export "main") (result i32)
    (local $res_ptr i32)
    (local $rows_ptr i32)
    (local $rows_len i32)
    
    ;; 1. Execute CREATE TABLE
    ;; db="verification_results"(20), sql="CREATE TABLE..." (67 chars)
    (call $sqlite_execute (i32.const 0) (i32.const 20) (i32.const 20) (i32.const 67))
    (local.set $res_ptr)
    (if (i32.load (local.get $res_ptr)) (then (return (i32.const 1)))) ;; Error

    ;; 2. Execute INSERT
    ;; sql="INSERT INTO..." (59 chars)
    (call $sqlite_execute (i32.const 0) (i32.const 20) (i32.const 90) (i32.const 59))
    (local.set $res_ptr)
    (if (i32.load (local.get $res_ptr)) (then (return (i32.const 2)))) ;; Error

    ;; 3. Execute QUERY
    ;; sql="SELECT * FROM..." (31 chars)
    (call $sqlite_query (i32.const 0) (i32.const 20) (i32.const 150) (i32.const 31))
    (local.set $res_ptr)
    (if (i32.load (local.get $res_ptr)) (then (return (i32.const 3)))) ;; Error
    
    ;; result<qr, string>: discriminant(4) + payload(16)
    ;; qr: columns(8) + rows(8)
    ;; rows: ptr(4) + len(4)
    (local.set $rows_ptr (i32.load (i32.add (local.get $res_ptr) (i32.const 12))))
    (local.set $rows_len (i32.load (i32.add (local.get $res_ptr) (i32.const 16))))
    
    (if (i32.gt_u (local.get $rows_len) (i32.const 0))
      (then
        (call $log (i32.const 190) (i32.const 8))
      )
    )

    (i32.const 0)
  )
)
