// Showcase: Rust — ownership, enums, traits, and error handling.
use std::collections::{HashMap, HashSet};
use std::fmt;
use std::fs;
use std::io::{self, BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

const VERSION: &str = "0.4.0";
const MAX_RETRIES: u32 = 3;
const FLAG: u8 = 0xFF;
const RATIO: f64 = 0.75;
const ANSWER: i32 = 40 + 2;
static STARTED: &str = "2026-01-01";

/// A typed slice of source text with UTF-16 offsets.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Token {
    pub kind: Kind,
    pub start: usize,
    pub end: usize,
}

impl Token {
    /// Width of the token in code units.
    pub const fn width(&self) -> usize {
        self.end - self.start
    }

    pub fn text<'a>(&self, source: &'a str) -> &'a str {
        &source[self.start..self.end]
    }
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}[{}..{}]", self.kind, self.start, self.end)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Kind {
    Keyword,
    String,
    Number,
    Comment,
    Other,
}

#[derive(Debug)]
pub enum HighlightError {
    Io(io::Error),
    Empty,
    UnknownLanguage(String),
}

impl fmt::Display for HighlightError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(e) => write!(f, "io error: {e}"),
            Self::Empty => write!(f, "empty source"),
            Self::UnknownLanguage(l) => write!(f, "unknown language: {l}"),
        }
    }
}

impl std::error::Error for HighlightError {}

impl From<io::Error> for HighlightError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

pub trait Highlighter {
    fn language(&self) -> &str;
    fn highlight(&self, source: &str) -> Result<Vec<Token>, HighlightError>;
}

pub struct KeywordHighlighter {
    language: String,
    keywords: HashSet<&'static str>,
    cache: HashMap<String, Vec<Token>>,
}

impl KeywordHighlighter {
    pub fn new(language: &str) -> Self {
        let keywords: HashSet<&'static str> =
            ["fn", "let", "mut", "return", "if", "else", "match"].into_iter().collect();
        Self { language: language.to_string(), keywords, cache: HashMap::new() }
    }
}

impl Highlighter for KeywordHighlighter {
    fn language(&self) -> &str {
        &self.language
    }

    fn highlight(&self, source: &str) -> Result<Vec<Token>, HighlightError> {
        if source.is_empty() {
            return Err(HighlightError::Empty);
        }
        let mut tokens = Vec::new();
        let mut offset = 0;
        for word in source.split_whitespace() {
            let kind = if self.keywords.contains(word) { Kind::Keyword } else { Kind::Other };
            tokens.push(Token { kind, start: offset, end: offset + word.len() });
            offset += word.len() + 1;
        }
        Ok(tokens)
    }
}

/// Retry with exponential backoff; generic over the error type.
pub fn retry<T, E, F>(mut f: F, retries: u32) -> Result<T, E>
where
    F: FnMut() -> Result<T, E>,
{
    let mut attempt = 0;
    loop {
        match f() {
            ok @ Ok(_) => return ok,
            Err(e) if attempt + 1 >= retries => return Err(e),
            Err(_) => {
                attempt += 1;
                std::thread::sleep(Duration::from_millis(100 * 2_u64.pow(attempt)));
            }
        }
    }
}

pub fn summarize<'a>(tokens: &'a [Token], source: &'a str) -> HashMap<Kind, Vec<&'a str>> {
    let mut groups: HashMap<Kind, Vec<&'a str>> = HashMap::new();
    for tok in tokens {
        groups.entry(tok.kind).or_default().push(tok.text(source));
    }
    groups
}

#[derive(Debug)]
struct Config {
    theme: String,
    workers: usize,
    verbose: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self { theme: "one-dark".to_string(), workers: 4, verbose: false }
    }
}

fn read_lines(path: &Path) -> Result<Vec<String>, HighlightError> {
    let file = fs::File::open(path)?;
    let reader = BufReader::new(file);
    reader.lines().collect::<Result<Vec<_>, _>>().map_err(HighlightError::from)
}

fn main() -> Result<(), HighlightError> {
    let started = Instant::now();
    let out: PathBuf = ["target", "out.txt"].iter().collect();

    let hl = KeywordHighlighter::new("rust");
    let src = "fn main() { let x = 42; }";
    let toks = hl.highlight(src)?;
    println!("{} tokens in {:?}", toks.len(), started.elapsed());

    let msg = format!("v{VERSION} ready since {STARTED}");
    let shout = msg.to_uppercase();
    println!("{shout} ({})", ANSWER);

    let cfg = Config { verbose: true, ..Default::default() };
    let Config { theme, workers, .. } = &cfg;
    println!("theme={theme} workers={workers}");

    let nums = vec![3, 1, 2];
    let doubled: Vec<i32> = nums.iter().map(|n| n * 2).filter(|n| *n > 2).collect();
    let total: i32 = doubled.iter().sum();
    assert!(total >= 0, "total went negative");

    match read_lines(Path::new("src/main.rs")) {
        Ok(lines) => println!("{} lines", lines.len()),
        Err(HighlightError::Empty) => println!("empty file"),
        Err(e) => return Err(e),
    }

    let raw = r#"raw "quoted" string"#;
    let raw_hash = r##"contains "# hashes"##;
    let ch = '🦀';
    println!("{raw} {raw_hash} {ch}");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_width() {
        let t = Token { kind: Kind::Keyword, start: 0, end: 2 };
        assert_eq!(t.width(), 2);
    }
}
