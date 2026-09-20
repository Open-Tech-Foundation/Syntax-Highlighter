' Showcase: VB.NET — modules, LINQ, XML literals.
Imports System
Imports System.Collections.Generic
Imports System.Linq

Module Demo
    Public Const Version As String = "0.4.0"

    Public Enum Kind
        Keyword
        Str
        Number
        Other
    End Enum

    Public Structure Span
        Public Start As Integer
        Public [End] As Integer
        Public K As Kind

        Public ReadOnly Property Width As Integer
            Get
                Return [End] - Start
            End Get
        End Property

        Public Overrides Function ToString() As String
            Return $"{K}[{Start}:{[End]}]"
        End Function
    End Structure

    Function Classify(word As String) As Kind
        Select Case word
            Case "'comment"
                Return Kind.Str
            Case "Dim", "Function", "Return", "If"
                Return Kind.Keyword
            Case Else
                Dim n As Integer
                If Integer.TryParse(word, n) Then Return Kind.Number
                Return Kind.Other
        End Select
    End Function

    Function Highlight(source As String) As List(Of Span)
        If String.IsNullOrWhiteSpace(source) Then
            Throw New ArgumentException("empty source", NameOf(source))
        End If
        Dim toks = New List(Of Span)()
        Dim off = 0
        For Each word In source.Split(" "c)
            toks.Add(New Span With {.Start = off, .End = off + word.Length, .K = Classify(word)})
            off += word.Length + 1
        Next
        Return toks
    End Function

    Sub Main(args As String())
        Dim toks = Highlight("Dim x As Integer = 42")
        Console.WriteLine($"{toks.Count} tokens")

        Dim users = New List(Of (Name As String, Age As Integer)) From {
            ("ada", 36), ("grace", 85), ("alan", 41)
        }
        Dim adults = From u In users
                     Where u.Age >= 18
                     Order By u.Age Descending
                     Select u.Name.ToUpper()
        Console.WriteLine(String.Join("; ", adults))

        Dim amount? As Decimal = If(args.Length > 0, CDec(args(0)), Nothing)
        Console.WriteLine($"amount={If(amount, 0D)}")

        Dim doc = <catalog>
                      <book id="b1">Tokens</book>
                  </catalog>
        Console.WriteLine(doc.<book>.@id)
    End Sub
End Module
