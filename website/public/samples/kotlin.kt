// Showcase: Kotlin — null safety, coroutines, and sealed hierarchies.
package demo.highlight

import kotlinx.coroutines.*
import kotlin.math.PI
import kotlin.math.pow
import kotlin.time.Duration.Companion.seconds

const val VERSION = "0.4.0"
const val MAX_RETRIES = 3
const val RATIO = 0.75

enum class Kind { KEYWORD, STRING, NUMBER, COMMENT, OTHER }

data class Span(val start: Int, val end: Int, val kind: Kind = Kind.OTHER) {
    val width: Int get() = end - start
    fun contains(offset: Int): Boolean = offset in start until end
    override fun toString(): String = "$kind[$start:$end]"
}

data class User(val id: Int, val name: String, val age: Int? = null) {
    val display: String get() = "$name (${age?.toString() ?: "n/a"})"
}

sealed interface Result<out T> {
    data class Ok<T>(val value: T) : Result<T>
    data class Err(val message: String, val code: Int = -1) : Result<Nothing>
}

interface Highlighter {
    val language: String
    fun highlight(source: String): List<Span>
}

abstract class CachingHighlighter(override val language: String = "kotlin") : Highlighter {
    private val cache = mutableMapOf<String, List<Span>>()

    final override fun highlight(source: String): List<Span> {
        require(source.isNotEmpty()) { "empty source" }
        return cache.getOrPut(source, defaultValue = { tokenize(source) })
    }

    protected abstract fun tokenize(source: String): List<Span>

    fun clear() = cache.clear()
}

class KeywordHighlighter(language: String = "kotlin") : CachingHighlighter(language) {
    private val keywords = setOf("fun", "return", "if", "class", "val")

    override fun tokenize(source: String): List<Span> {
        val out = mutableListOf<Span>()
        var offset = 0
        for (word in source.split(Regex("\\s+"))) {
            if (word.isEmpty()) {
                offset += 1
                continue
            }
            val kind = when {
                word in keywords -> Kind.KEYWORD
                word.startsWith('"') -> Kind.STRING
                word.toIntOrNull() != null -> Kind.NUMBER
                else -> Kind.OTHER
            }
            out += Span(offset, offset + word.length, kind)
            offset += word.length + 1
        }
        return out
    }
}

// Extension functions and properties.
fun String.shout(): String = uppercase() + "!"
val String.wordCount: Int get() = split(Regex("\\s+")).size

fun greet(name: String? = null, punct: Char = '!'): String {
    val who = name?.takeIf { it.isNotBlank() } ?: "world"
    return "hello, $who$punct"
}

fun area(shape: String, vararg dims: Double): Double = when (shape) {
    "circle" -> PI * dims[0].pow(2)
    "rect" -> dims[0] * dims[1]
    else -> throw IllegalArgumentException("unknown shape: $shape")
}

suspend fun fetchStatus(url: String, retries: Int = MAX_RETRIES): Result<Int> {
    repeat(retries) { attempt ->
        try {
            delay((attempt + 1) * 100L)
            return Result.Ok(200)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (attempt == retries - 1) return Result.Err(e.message ?: "failed")
        }
    }
    return Result.Err("unreachable")
}

fun main() = runBlocking {
    val hl = KeywordHighlighter()
    val toks = hl.highlight("fun main return 0")
    println("${toks.size} tokens")

    val users = listOf(User(1, "Ada", 36), User(2, "Grace", 85), User(3, "Alan"))
    val adults = users.filter { (it.age ?: 0) >= 18 }
    val names = adults.sortedByDescending { it.age }.map { it.name.uppercase() }
    println(names.joinToString("; ") + " total=${adults.sumOf { it.age ?: 0 }}")

    val byInitial = users.groupBy { it.name.first() }
    for ((initial, group) in byInitial) {
        println("$initial -> ${group.size}")
    }

    val (first, second, rest) = Triple(users[0], users[1], users.drop(2))
    println("$first $second ${rest.size}")

    val status = async { fetchStatus("https://example.com") }
    val timer = async {
        repeat(3) { i ->
            delay(1.seconds)
            println("tick $i")
        }
        "ticks-done"
    }
    when (val res = status.await()) {
        is Result.Ok -> println("status=${res.value}")
        is Result.Err -> println("error ${res.code}: ${res.message}")
    }
    println(timer.await())

    val lazyValue: String by lazy { "computed".shout() }
    println(lazyValue + " words=${lazyValue.wordCount}")

    with(StringBuilder()) {
        append("a")
        append("b")
        println("built=$this length=$length")
    }

    users.forEachIndexed { index, user ->
        if (user.age == null) return@forEachIndexed
        println("#$index ${user.display}")
    }
}
