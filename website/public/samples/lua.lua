-- Showcase: Lua — tables, metatables, coroutines.
local VERSION = "0.4.0"

local Span = {}
Span.__index = Span

function Span.new(start, finish, kind)
  return setmetatable({ start = start, finish = finish, kind = kind or "other" }, Span)
end

function Span:width()
  return self.finish - self.start
end

function Span:__tostring()
  return ("%s[%d:%d]"):format(self.kind, self.start, self.finish)
end

local keywords = { ["function"] = true, ["end"] = true, ["if"] = true, ["return"] = true }

local Highlighter = {}
Highlighter.__index = Highlighter

function Highlighter.new(language)
  return setmetatable({ language = language or "lua", cache = {} }, Highlighter)
end

function Highlighter:highlight(source)
  assert(#source > 0, "empty source")
  if self.cache[source] then return self.cache[source] end
  local toks, off = {}, 0
  for word in source:gmatch("%S+") do
    local kind = keywords[word] and "keyword" or "other"
    toks[#toks + 1] = Span.new(off, off + #word, kind)
    off = off + #word + 1
  end
  self.cache[source] = toks
  return toks
end

local function greet(name, punct)
  name, punct = name or "world", punct or "!"
  return ("hello, %s%s"):format(name, punct)
end

local squares = {}
for i = 1, 10 do squares[i] = i * i end

local total = 0
for _, n in ipairs(squares) do
  if n % 2 == 0 then total = total + n end
end
print("total=" .. total)

local co = coroutine.create(function()
  for i = 3, 1, -1 do coroutine.yield(i) end
  return "done"
end)
while true do
  local ok, v = coroutine.resume(co)
  print(ok, v)
  if coroutine.status(co) == "dead" then break end
end

local t = setmetatable({}, { __add = function(a, b) return a.n + b.n end })
print(greet(nil), greet("ada", "?"))
