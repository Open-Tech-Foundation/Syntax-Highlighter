// Showcase: Dart — null safety, futures, and extensions.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

const version = '0.4.0';
const maxRetries = 3;

enum Kind { keyword, string, number, comment, other }

class Span {
  final int start;
  final int end;
  final Kind kind;

  const Span(this.start, this.end, [this.kind = Kind.other]);

  int get width => end - start;
  bool contains(int offset) => offset >= start && offset < end;

  @override
  String toString() => '${kind.name}[$start:$end]';
}

abstract class Highlighter {
  String get language;
  List<Span> highlight(String source);
}

class KeywordHighlighter extends Highlighter {
  @override
  final String language;
  final Set<String> _keywords;
  final Map<String, List<Span>> _cache = {};

  KeywordHighlighter([this.language = 'dart'])
      : _keywords = {'class', 'return', 'if', 'final', 'const'};

  @override
  List<Span> highlight(String source) {
    if (source.isEmpty) throw ArgumentError('empty source');
    return _cache.putIfAbsent(source, () {
      final toks = <Span>[];
      var offset = 0;
      for (final word in source.split(RegExp(r'\s+'))) {
        final kind = _keywords.contains(word) ? Kind.keyword : Kind.other;
        toks.add(Span(offset, offset + word.length, kind));
        offset += word.length + 1;
      }
      return toks;
    });
  }
}

extension SpanList on List<Span> {
  Map<Kind, int> get counts {
    final map = <Kind, int>{};
    for (final t in this) {
      map[t.kind] = (map[t.kind] ?? 0) + 1;
    }
    return map;
  }
}

Future<int> fetchStatus(String url) async {
  for (var attempt = 1;; attempt++) {
    try {
      final client = HttpClient();
      final req = await client.getUrl(Uri.parse(url));
      final res = await req.close();
      await res.drain();
      return res.statusCode;
    } catch (e) {
      if (attempt >= maxRetries) rethrow;
      await Future.delayed(Duration(milliseconds: 100 * attempt));
    }
  }
}

Stream<int> tick(int n) async* {
  for (var i = n; i >= 1; i--) {
    await Future.delayed(const Duration(milliseconds: 50));
    yield i;
  }
}

void main(List<String> args) async {
  final hl = KeywordHighlighter();
  final toks = hl.highlight('class Demo return 0');
  print('${toks.length} tokens');

  final users = <String, int?>{'ada': 36, 'grace': 85, 'alan': null};
  final total = users.values.whereType<int>().fold(0, (a, b) => a + b);
  print('total=$total');

  await for (final t in tick(3)) {
    stdout.write('$t ');
  }
  print('');

  const raw = r'raw $noInterp \n';
  final multi = '''
line one
line ${1 + 1}
''';
  print('$raw$multi');
}
