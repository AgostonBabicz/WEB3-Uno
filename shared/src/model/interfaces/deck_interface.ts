import { Shuffler } from "../../utils/random_utils";
import { Card} from "../deck";

export interface Deck{
    deal:()=>Card | undefined,
    shuffle:(shuffler:Shuffler<Card>)=>void,
    filter:(predicate: (card: Card) => boolean)=>Deck,
    toMemento:()=>Array<Record<string, string | number>> ,
    getDeck:()=>Card[],
    readonly size: number,
    top:()=>Card | undefined
    getDeckUnderTop:()=>Card[]
    peek:()=>Card|undefined
}

export type MakeDeck = (
  cards: Card[] | Record<string, string | number>[]
) => Deck;