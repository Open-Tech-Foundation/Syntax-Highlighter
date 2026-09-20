// Showcase: Zig — comptime, errors, slices, testing.
const std = @import("std");

const version = "0.4.0";
const max_retries = 3;

const Kind = enum { keyword, string, number, comment, other };

const Token = struct {
    kind: Kind,
    start: usize,
    end: usize,

    pub fn width(self: Token) usize {
        return self.end - self.start;
    }

    pub fn text(self: Token, source: []const u8) []const u8 {
        return source[self.start..self.end];
    }
};

const HighlightError = error{ Empty, UnknownLanguage };

const Highlighter = struct {
    language: []const u8,
    keywords: std.StaticStringMap(void),

    pub fn highlight(self: *const Highlighter, source: []const u8) HighlightError![]Token {
        if (source.len == 0) return HighlightError.Empty;
        var toks = std.ArrayList(Token).init(std.heap.page_allocator);
        defer toks.deinit();
        var it = std.mem.tokenizeAny(u8, source, " \t\n");
        var off: usize = 0;
        while (it.next()) |word| {
            const kind: Kind = if (self.keywords.has(word)) .keyword else .other;
            try toks.append(Token{ .kind = kind, .start = off, .end = off + word.len });
            off += word.len + 1;
        }
        return toks.toOwnedSlice();
    }
};

fn retry(comptime T: type, f: *const fn () anyerror!T, times: u32) anyerror!T {
    var attempt: u32 = 0;
    while (true) {
        return f() catch |err| {
            attempt += 1;
            if (attempt >= times) return err;
            std.time.sleep(100 * std.time.ns_per_ms);
        };
    }
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    const args = try std.process.argsAlloc(alloc);
    defer std.process.argsFree(alloc, args);

    const stdout = std.io.getStdOut().writer();
    const src = if (args.len > 1) args[1] else "fn main return 0";
    try stdout.print("{s} -> {d} bytes\n", .{ src, src.len });

    const nums = [_]i32{ 3, 1, 2 };
    var total: i32 = 0;
    for (nums) |n| {
        total += n * 2;
    }
    switch (total) {
        0...10 => try stdout.print("small\n", .{}),
        11...100 => try stdout.print("medium\n", .{}),
        else => try stdout.print("large\n", .{}),
    }

    const maybe: ?[]const u8 = null;
    const name = maybe orelse "world";
    try stdout.print("hello, {s}!\n", .{name});
}

test "token width" {
    const t = Token{ .kind = .keyword, .start = 0, .end = 2 };
    try std.testing.expectEqual(@as(usize, 2), t.width());
}
