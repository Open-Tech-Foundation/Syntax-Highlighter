# Showcase: make — pattern rules, variables, and phony targets.
CC ?= gcc
CFLAGS ?= -std=c17 -Wall -Wextra -O2
PREFIX ?= /usr/local

SRC := $(wildcard src/*.c)
OBJ := $(SRC:src/%.c=build/%.o)
LIB := build/libhighlight.a
BIN := build/demo

.PHONY: all clean test install lint

all: $(BIN)

$(BIN): $(LIB) tools/demo.c
	$(CC) $(CFLAGS) -o $@ tools/demo.c -Lbuild -lhighlight

$(LIB): $(OBJ)
	ar rcs $@ $^

build/%.o: src/%.c include/%.h | build
	$(CC) $(CFLAGS) -Iinclude -c $< -o $@

build:
	mkdir -p $@

test: $(BIN)
	./$(BIN) --self-test
	@echo "tests passed"

lint:
	@echo "checking $(words $(SRC)) sources"

install: $(BIN)
	install -Dm755 $(BIN) $(DESTDIR)$(PREFIX)/bin/demo
	install -Dm644 $(LIB) $(DESTDIR)$(PREFIX)/lib/libhighlight.a

clean:
	rm -rf build

-include build/*.d
