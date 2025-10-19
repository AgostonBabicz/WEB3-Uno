import { Card } from "../deck";

export interface PlayerHand{
    add:(card:Card)=>void
    getPlayerHand:()=>Card[]
    playCard:(cardIx:number)=>Card
    size:()=>number
    hasColor:(color:string)=>boolean
}

export type MakePlayerHand  = (cards?:Card[]) => PlayerHand