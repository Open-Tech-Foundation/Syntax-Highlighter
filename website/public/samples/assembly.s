; Showcase: x86-64 assembly — syscalls, stack frames, SIMD.
; nasm -felf64 demo.s && ld -o demo demo.o
global _start

section .data
    msg db "tokens: ", 0
    msg_len equ $ - msg
    version db "0.4.0", 10, 0

section .bss
    outbuf resb 64
    count resq 1

section .text
_start:
    ; print the label
    mov rax, 1              ; sys_write
    mov rdi, 1              ; stdout
    lea rsi, [rel msg]
    mov rdx, msg_len
    syscall

    ; count words in a static string (demo)
    lea rsi, [rel version]
    xor ecx, ecx
.count:
    mov al, [rsi + rcx]
    test al, al
    jz .done
    inc rcx
    jmp .count
.done:
    mov [rel count], rcx

    ; print count as decimal
    mov rax, [rel count]
    lea rdi, [rel outbuf + 63]
    mov byte [rdi], 10
    mov rbx, 10
.toascii:
    xor rdx, rdx
    div rbx                 ; rax = rax/10, rdx = digit
    add dl, '0'
    dec rdi
    mov [rdi], dl
    test rax, rax
    jnz .toascii

    mov rsi, rdi
    mov rdx, outbuf + 64
    sub rdx, rsi
    mov rax, 1
    mov rdi, 1
    syscall

    ; vectorized byte sum with SSE2
    movdqu xmm0, [rel msg]
    pxor xmm1, xmm1
    psadbw xmm0, xmm1
    movq rax, xmm0

    ; exit(0)
    mov rax, 60
    xor rdi, rdi
    syscall
