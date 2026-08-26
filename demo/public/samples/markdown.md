# Markdown Syntax Test Sample

This document contains examples of **common Markdown syntax** for testing a Markdown renderer.

## 1. Headings

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## 2. Text Formatting

This is **bold text**.

This is *italic text*.

This is ***bold and italic text***.

This is ~~strikethrough text~~.

This is `inline code`.

This is a [link to OpenAI](https://openai.com).

## 3. Paragraphs and Line Breaks

This is the first paragraph.

This is the second paragraph.

This line has a forced line break.
This line appears immediately below it.

## 4. Blockquotes

> This is a blockquote.
>
> It can contain multiple paragraphs.
>
> > And it can contain nested blockquotes.

## 5. Lists

### Unordered List

* Item one
* Item two

  * Nested item
  * Another nested item
* Item three

### Ordered List

1. First item
2. Second item
3. Third item

   1. Nested numbered item
   2. Another nested item

### Task List

* [ ] Uncompleted task
* [x] Completed task
* [ ] Another task

## 6. Code

Inline code: `const answer = 42;`

### JavaScript

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}

console.log(greet("Markdown"));
```

### Python

```python
def greet(name):
    return f"Hello, {name}!"

print(greet("Markdown"))
```

### Plain Code

```text
This is a plain text code block.
No syntax highlighting should be applied.
```

## 7. Horizontal Rules

---

---

---

## 8. Tables

| Name    | Type  | Status   | Score |
| ------- | ----- | -------- | ----: |
| Alice   | Admin | Active   |    95 |
| Bob     | User  | Active   |    87 |
| Charlie | User  | Inactive |    72 |
| Dana    | Admin | Active   |    99 |

## 9. Escaping Markdown

*This text is not italicized.*

# This is not a heading.

Use a backslash to escape special Markdown characters:

* `\*` → literal asterisk
* `\_` → literal underscore
* `\#` → literal hash
* `\[ \]` → literal brackets

## 10. Images

![Example image](https://via.placeholder.com/300x150 "Example image")

## 11. Links

[Inline link](https://example.com)

https://example.com

[test@example.com](mailto:test@example.com)

## 12. HTML

<div>
  <strong>This is HTML inside Markdown.</strong>
</div>

<details>
<summary>Click to expand</summary>

Hidden content can go here.

</details>

## 13. Footnotes

Here is a sentence with a footnote.[^1]

[^1]: This is the footnote text.

## 14. Definition-Style Example

Markdown
: A lightweight markup language.

HTML
: HyperText Markup Language.

## 15. Special Characters

Ampersand: &

Less than: <

Greater than: >

Copyright: ©

Em dash: —

Ellipsis: …

Emoji: 🚀 🎉 ✅

## 16. Mixed Formatting

> **Important:** This blockquote contains **bold**, *italic*, `code`, and a [link](https://example.com).

* **Bold list item**
* *Italic list item*
* `Code list item`
* [Linked list item](https://example.com)

## 17. Long Text Test

Lorem ipsum dolor sit amet, consectetur adipiscing elit. **Bold text** and *italic text* can appear within a paragraph. Markdown renderers should correctly preserve spacing, wrapping, punctuation, and inline formatting.

---

## 18. Final Test

**Bold** | *Italic* | ~~Strike~~ | `Code` | [Link](https://example.com)

> End of Markdown syntax test.

```text
Markdown rendering test complete.
```
