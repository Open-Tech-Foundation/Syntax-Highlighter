#!/usr/bin/env bash
# Showcase: Bash — functions, conditionals, loops, and expansions.
set -euo pipefail
IFS=$'\n\t'

readonly APP_NAME="highlighter"
readonly VERSION="0.4.0"
readonly RETRIES=3
readonly TIMEOUT=30

log() {
  local level="$1"; shift
  printf '[%s] %s: %s\n' "$(date '+%H:%M:%S')" "$level" "$*" >&2
}

die() { log "ERROR" "$*"; exit 1; }

usage() {
  cat <<USAGE
Usage: ${0##*/} [options] <input>

Options:
  -l, --lang LANG   Language to highlight (default: auto)
  -t, --theme NAME  Theme name (default: ${THEME:-default})
  -o, --out FILE    Write output to FILE instead of stdout
  -h, --help        Show this help
USAGE
}

# Defaults that callers may override through the environment.
: "${THEME:=default}"
: "${VERBOSE:=0}"

cleanup() {
  local code=$?
  rm -rf "${TMPDIR:-/tmp}/${APP_NAME}.$$"
  exit "$code"
}
trap cleanup EXIT INT TERM

parse_args() {
  LANG="auto"; OUT=""
  while (($# > 0)); do
    case "$1" in
      -l|--lang) LANG="$2"; shift 2 ;;
      -t|--theme) THEME="$2"; shift 2 ;;
      -o|--out) OUT="$2"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      --) shift; break ;;
      -*) die "unknown option: $1" ;;
      *) INPUT="$1"; shift ;;
    esac
  done
  [[ -n "${INPUT:-}" ]] || { usage >&2; die "missing <input>"; }
}

retry() {
  local attempt=1 cmd=("$@")
  until "${cmd[@]}"; do
    if ((attempt >= RETRIES)); then return 1; fi
    log "WARN" "attempt $attempt failed, retrying…"
    sleep $((attempt * 2))
    ((attempt++)) || true
  done
}

highlight_file() {
  local file="$1"
  [[ -f "$file" ]] || die "not a file: $file"
  [[ -r "$file" ]] || die "not readable: $file"
  local size
  size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
  if ((size > 1048576)); then
    log "WARN" "$file is ${size} bytes; truncating to 1MiB"
  fi
  head -c 1048576 "$file"
}

main() {
  parse_args "$@"
  ((VERBOSE == 1)) && set -x

  local ext="${INPUT##*.}"
  if [[ "$LANG" == "auto" ]]; then
    case "$ext" in
      js|mjs|cjs) LANG="javascript" ;;
      ts) LANG="typescript" ;;
      py) LANG="python" ;;
      sh) LANG="bash" ;;
      *) LANG="plaintext" ;;
    esac
  fi

  local fruits=("apple" "banana" "cherry")
  echo "Available: ${fruits[*]} (${#fruits[@]} total)"
  for fruit in "${fruits[@]}"; do
    echo " - ${fruit^^} (${#fruit} chars)"
  done

  declare -A THEMES=( [dark]="one-dark" [light]="github-light" )
  for mode in "${!THEMES[@]}"; do
    echo "$mode -> ${THEMES[$mode]}"
  done

  local i=0
  while ((i < RETRIES)); do
    echo "pass $((i + 1))/$RETRIES"
    ((++i))
  done

  until [[ -n "${READY:-}" ]]; do
    READY=1
    echo "warming up…"
  done

  echo "user=$USER home=${HOME:-/root} path entries: $(echo "$PATH" | tr ':' '\n' | wc -l)"
  echo "pid=$$ parent=$PPID args=$# status=$?"

  if command -v node >/dev/null 2>&1; then
    node --version
  elif command -v deno >/dev/null 2>&1; then
    deno --version
  else
    log "WARN" "no JS runtime found"
  fi

  local out
  out=$(retry highlight_file "$INPUT") || die "highlight failed"
  if [[ -n "$OUT" ]]; then
    printf '%s' "$out" > "$OUT"
    echo "wrote $OUT"
  else
    printf '%s\n' "$out"
  fi
}

main "$@"
