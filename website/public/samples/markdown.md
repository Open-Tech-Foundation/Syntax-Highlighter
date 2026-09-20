# Showcase: Markdown — every common construct in one document.

## Headings from H1 to H6

### H3 follows H2

#### H4 keeps nesting

##### H5 and H6 exist too

###### H6 is the deepest

Paragraphs support **bold**, *italic*, ***bold italic***, ~~strikethrough~~,
`inline code`, and escaped \*asterisks\* plus \_underscores\_.

> Blockquotes can span lines.
> > Nested quotes go deeper.
>
> — with attribution

Unordered lists with three markers:

- dash item with `code`
- [ ] unchecked task
- [x] checked task

* star item with **bold**

+ plus item with *italic*

Ordered lists keep counting:

1. First step
2. Second step with a [link](https://example.com "title")
3. Third step with ![alt text](https://example.com/img.png)

Autolinks work too: <https://opentechf.org> and <ada@example.com>.
Bare URLs also highlight: https://github.com/Open-Tech-Foundation/Syntax-Highlighter

Reference links keep documents tidy: see the [docs][docs-ref] and [quickstart].

[docs-ref]: https://example.com/docs
[quickstart]: https://example.com/start "Quickstart guide"

Footnote definitions sit at the bottom of the file.[^1]

Tables align columns with pipes:

| Language   | Files | Tokens |
| :--------- | ----: | :----: |
| JavaScript |   120 |  9,800 |
| Python     |    85 |  6,100 |
| Rust       |    40 |  3,300 |
| Go         |    32 |  2,700 |

Inline HTML is passed through: <kbd>Ctrl</kbd> + <kbd>C</kbd> copies.

Code spans with backticks: `` `nested` `` and fenced blocks below.

```javascript
const answer = 40 + 2;
console.log(`answer: ${answer}`); // 42
```

```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

```python
def greet(name: str) -> str:
    return f"hello, {name}!"
```

```bash
echo "indented code also works"
```

    four-space indented code block
    second line keeps the fence style

Horizontal rules come in three flavors:

---

***

___

Emoji shortcodes render inline: :sparkles: :rocket: :tada:

Math-ish text stays plain: $E = mc^2$ and \(a^2 + b^2 = c^2\).

A final paragraph ties it together with a footnote reference.[^1]

[^1]: Footnotes collect details without breaking the reading flow.

## Details and callouts

<details>
<summary>How are samples loaded?</summary>

Each language ships a showcase file fetched at runtime.

</details>

> [!NOTE]
> Admonition-style quotes render as regular quotes.
