-- Showcase: Elm — Model/Update/View with commands.
module Main exposing (main)

import Browser
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput)
import Http
import Json.Decode as Decode
import Url


type alias Token =
    { kind : String
    , start : Int
    , end : Int
    }


type alias Model =
    { source : String
    , tokens : List Token
    , loading : Bool
    , error : Maybe String
    , key : Nav.Key
    }


type Msg
    = Edit String
    | Highlight
    | GotTokens (Result Http.Error (List Token))
    | LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url


tokenDecoder : Decode.Decoder Token
tokenDecoder =
    Decode.map3 Token
        (Decode.field "type" Decode.string)
        (Decode.field "start" Decode.int)
        (Decode.field "end" Decode.int)


init : () -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init _ _ key =
    ( { source = "let answer = 40 + 2", tokens = [], loading = False, error = Nothing, key = key }
    , Cmd.none
    )


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Edit src ->
            ( { model | source = src }, Cmd.none )

        Highlight ->
            ( { model | loading = True, error = Nothing }
            , Http.post
                { url = "/api/highlight"
                , body = Http.stringBody "text/plain" model.source
                , expect = Http.expectJson GotTokens (Decode.list tokenDecoder)
                }
            )

        GotTokens (Ok toks) ->
            ( { model | tokens = toks, loading = False }, Cmd.none )

        GotTokens (Err _) ->
            ( { model | loading = False, error = Just "highlight failed" }, Cmd.none )

        LinkClicked (Browser.Internal url) ->
            ( model, Nav.pushUrl model.key (Url.toString url) )

        LinkClicked (Browser.External href) ->
            ( model, Nav.load href )

        UrlChanged _ ->
            ( model, Cmd.none )


view : Model -> Browser.Document Msg
view model =
    { title = "Playground"
    , body =
        [ h1 [] [ text "Playground" ]
        , textarea [ value model.source, onInput Edit, rows 6 ] []
        , button [ onClick Highlight, disabled model.loading ]
            [ text (if model.loading then "Working…" else "Highlight") ]
        , p [] [ text (String.fromInt (List.length model.tokens) ++ " tokens") ]
        , ul [] (List.map viewToken model.tokens)
        ]
    }


viewToken : Token -> Html Msg
viewToken t =
    li [] [ code [] [ text (t.kind ++ " [" ++ String.fromInt t.start ++ "]") ] ]


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


main : Program () Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }
