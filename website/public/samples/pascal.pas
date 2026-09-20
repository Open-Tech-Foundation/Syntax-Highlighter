{ Showcase: Pascal — units, classes, and generics. }
unit Highlight;

{$mode objfpc}{$H+}

interface

uses
  SysUtils, Classes, Generics.Collections;

type
  TKind = (kKeyword, kString, kNumber, kOther);

  TSpan = record
    Start, Finish: Integer;
    Kind: TKind;
    function Width: Integer;
    function ToString: string;
  end;

  THighlighter = class
  private
    FLanguage: string;
    FCache: specialize TDictionary<string, specialize TList<TSpan>>;
  public
    constructor Create(const ALanguage: string = 'pascal');
    destructor Destroy; override;
    function Highlight(const Source: string): specialize TList<TSpan>;
    property Language: string read FLanguage;
  end;

implementation

function TSpan.Width: Integer;
begin
  Result := Finish - Start;
end;

function TSpan.ToString: string;
begin
  Result := Format('%d[%d:%d]', [Ord(Kind), Start, Finish]);
end;

constructor THighlighter.Create(const ALanguage: string);
begin
  inherited Create;
  FLanguage := ALanguage;
  FCache := specialize TDictionary<string, specialize TList<TSpan>>.Create;
end;

destructor THighlighter.Destroy;
var
  Pair: specialize TPair<string, specialize TList<TSpan>>;
begin
  for Pair in FCache do
    Pair.Value.Free;
  FCache.Free;
  inherited Destroy;
end;

function THighlighter.Highlight(const Source: string): specialize TList<TSpan>;
var
  Words: TStringArray;
  W: string;
  Offset: Integer;
begin
  if Source = '' then
    raise Exception.Create('empty source');
  if FCache.TryGetValue(Source, Result) then
    Exit;
  Result := specialize TList<TSpan>.Create;
  Offset := 0;
  Words := Source.Split([' ']);
  for W in Words do
  begin
    Result.Add(Default(TSpan));
    Inc(Offset, Length(W) + 1);
  end;
  FCache.Add(Source, Result);
end;

end.
