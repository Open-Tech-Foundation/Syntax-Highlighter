{-# Showcase: Haskell — ADTs, typeclasses, monads. #-}
{-# LANGUAGE OverloadedStrings #-}
module Highlight
  ( Kind(..)
  , Span(..)
  , highlight
  , summarize
  ) where

import qualified Data.Map.Strict as Map
import qualified Data.Set as Set
import qualified Data.Text as T
import Data.List (foldl', sortOn)
import Data.Maybe (mapMaybe)
import Control.Applicative ((<|>))
import Control.Monad (forM_)

version :: String
version = "0.4.0"

data Kind = Keyword | Str | Number | Comment | Other
  deriving (Show, Eq, Ord, Enum, Bounded)

data Span = Span
  { spanStart :: !Int
  , spanEnd   :: !Int
  , spanKind  :: !Kind
  } deriving (Show, Eq)

width :: Span -> Int
width s = spanEnd s - spanStart s

keywords :: Set.Set T.Text
keywords = Set.fromList ["let", "in", "where", "case", "of", "do"]

classify :: T.Text -> Kind
classify w
  | "TODO" `T.isPrefixOf` w = Comment
  | Set.member w keywords    = Keyword
  | T.all (`elem` ("0123456789." :: String)) w = Number
  | otherwise                = Other

highlight :: T.Text -> [Span]
highlight src = go 0 (T.words src)
  where
    go _ [] = []
    go off (w:ws) =
      Span off (off + T.length w) (classify w) : go (off + T.length w + 1) ws

summarize :: [Span] -> Map.Map Kind Int
summarize = foldl' (\m s -> Map.insertWith (+) (spanKind s) 1 m) Map.empty

data Result a = Ok a | Err String deriving (Show, Functor)

instance Applicative Result where
  pure = Ok
  Ok f <*> Ok x = Ok (f x)
  Err e <*> _ = Err e
  _ <*> Err e = Err e

instance Monad Result where
  Ok x >>= f = f x
  Err e >>= _ = Err e

parseCount :: String -> Result Int
parseCount s = case reads s of
  [(n, "")] -> if n >= 0 then Ok n else Err "negative"
  _          -> Err ("not a number: " ++ s)

main :: IO ()
main = do
  let toks = highlight "let x = 42 -- done"
  print (length toks)
  forM_ (Map.toList (summarize toks)) $ \(k, n) ->
    putStrLn (show k ++ ": " ++ show n)
  let total = sum [x * x | x <- [1..10], even x]
  print total
  print (parseCount "42" >> parseCount "7" >>= \a b -> Ok (a + b))
  contents <- getContents
  putStrLn (reverse contents)
