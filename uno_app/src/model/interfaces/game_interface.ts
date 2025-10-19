import { Randomizer, Shuffler } from "../../utils/random_utils"
import { Card } from "../deck"
import { Round } from "./round_interface"


export interface Game{
    // GameImplmentation has all we need, this is just for the uno.test.ts to pass
    readonly playerCount: number;
    readonly targetScore: number;
    player:(player:number)=>string
    score:(player:number)=>number
    winner:()=>number|undefined
    currentRound:()=>Round | undefined
    toMemento:()=>any
}

export type MakeGame = (randomizer: Randomizer, shuffler: Shuffler<Card>, cardsPerPlayer: number, players?: string[], targetScore?: number) => Game