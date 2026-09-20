// Showcase: Scala — case classes, pattern matching, futures.
import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.*
import scala.util.{Failure, Success, Try}

object HighlightDemo:
  val version = "0.4.0"

  enum Kind:
    case Keyword, Str, Number, Comment, Other

  case class Span(start: Int, end: Int, kind: Kind = Kind.Other):
    def width: Int = end - start
    def contains(offset: Int): Boolean = offset >= start && offset < end

  sealed trait Result[+A]
  case class Ok[A](value: A) extends Result[A]
  case class Err(message: String) extends Result[Nothing]

  trait Highlighter:
    def language: String
    def highlight(source: String): List[Span]

  class KeywordHighlighter(val language: String = "scala") extends Highlighter:
    private val keywords = Set("def", "val", "class", "match", "case")
    private val cache = scala.collection.mutable.Map.empty[String, List[Span]]

    def highlight(source: String): List[Span] =
      cache.getOrElseUpdate(source, {
        var offset = 0
        source.split("\\s+").toList.map { word =>
          val kind = if keywords(word) then Kind.Keyword else Kind.Other
          val span = Span(offset, offset + word.length, kind)
          offset += word.length + 1
          span
        }
      })

  extension (s: String) def shout: String = s.toUpperCase + "!"
  extension [T](xs: List[T]) def second: Option[T] = xs.drop(1).headOption

  def area(shape: String, dims: Double*): Double = shape match
    case "circle" => math.Pi * dims(0) * dims(0)
    case "rect"   => dims(0) * dims(1)
    case _        => throw IllegalArgumentException(s"unknown $shape")

  def fetchAll(urls: List[String]): Future[List[String]] =
    Future.traverse(urls)(url => Future(s"body of $url"))

  @main def run(): Unit =
    val hl = KeywordHighlighter()
    val toks = hl.highlight("def main match case")
    println(s"${toks.size} tokens")

    val users = List(("ada", 36), ("grace", 85))
    val names = for (name, age) <- users if age >= 18 yield name.toUpperCase
    println(names.mkString("; "))

    val res: Result[Int] = Ok(42)
    val msg = res match
      case Ok(v)  => s"ok: $v"
      case Err(m) => s"err: $m"
    println(msg)

    val fut = fetchAll(List("a", "b"))
    fut.onComplete {
      case Success(bodies) => println(bodies.size)
      case Failure(e)      => println(s"failed: ${e.getMessage}")
    }
    println(Await.result(fut, 5.seconds).head)
