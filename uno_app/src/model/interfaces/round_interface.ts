import { Shuffler } from "../../utils/random_utils"
import { Card, Color } from "../deck"
import { Deck } from "./deck_interface"

export interface Round {
    //So that the uno.test.ts passes (implementation has all we need)
    readonly dealer: number;

    player: (num: number) => string
    playerHand: (num: number) => Card[]
    discardPile:()=>Deck
    drawPile:()=>Deck
    playerInTurn:()=>number|undefined
    play:(cardIx:number,askedColor?:Color)=>Card
    canPlay:(cardIx:number)=>boolean
    canPlayAny:()=>boolean
    draw:()=>void
    catchUnoFailure:({ accuser, accused }: { accuser: number; accused: number }) => boolean
    hasEnded:()=>boolean
    winner:()=>number|undefined
    score :()=> number|undefined
    toMemento:()=>any
    sayUno:(player:number)=>void,
    onEnd:(cb: (e: { winner: number }) => void)=>void,
}

export type MakeRound = (players: string[], dealer: number, shuffler: Shuffler<Card>, cardsPerPlay: number) => Round