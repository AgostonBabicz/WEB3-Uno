import { Randomizer, Shuffler } from "../utils/random_utils";
import { Card, Color } from "./deck";
import type { Game, MakeGame } from "./interfaces/game_interface";
import type { Round } from "./interfaces/round_interface";
import { makeRound } from "./round";

export class GameImplementation implements Game {
    public playerCount: Readonly<number>
    public targetScore: Readonly<number>
    private players: string[]
    private scores: number[] = [];
    private presentRound: Round | undefined
    private randomizer: Randomizer
    private shuffler: Shuffler<Card>
    private cardsPerPlayer: number

    constructor(players: string[] = ['A', 'B'], targetScore: number = 500, randomizer: Randomizer, shuffler: Shuffler<Card>, cardsPerPlayer: number) {
        if (players.length < 2) {
            throw new Error("A Game requires at least 2 players")
        }
        if (targetScore <= 0) {
            throw new Error("A Game requires a target score of more than 0")
        }
        this.players = players
        this.playerCount = players.length
        this.targetScore = targetScore
        this.players.forEach(() => this.scores.push(0))
        this.randomizer = randomizer
        this.shuffler = shuffler
        this.cardsPerPlayer = cardsPerPlayer
         this.scores = new Array(players.length).fill(0)
        if (this.scores.some(s => s < 0)) {
            throw new Error("Scores must be non-negative")
        }
        if (cardsPerPlayer <= 0) {
            throw new Error("A Game requires dealing at least 1 card per player")
        }
        if (players.length !== this.scores.length) {
            console.log(players.length, this.scores.length)
            throw new Error("Scores length must match players length")
        }
        if (this.scores.filter(s => s >= targetScore).length > 1) {
            throw new Error("There can be at most one winner")
        }
        const dealer = this.randomizer(this.playerCount)
        this.presentRound = makeRound(players, dealer, this.shuffler, this.cardsPerPlayer)
        this.attachRoundHandlers();
    }
    player(player: number): string {
        if (player < 0 || player >= this.playerCount) throw new Error("Player index is out of bounds")
        return this.players[player]
    }
    score(player: number): number {
        this.attachRoundHandlers();
        return this.scores[player]
    }
    winner(): number | undefined {
        this.attachRoundHandlers();
        const ix = this.scores.findIndex(s => s >= this.targetScore);
        return ix === -1 ? undefined : ix;
    }
    currentRound(): Round | undefined {
        this.attachRoundHandlers();
        return this.presentRound;
    }
    toMemento(): GameMemento {
        const roundMemento = this.presentRound ? this.presentRound.toMemento() : undefined;

        return {
            cardsPerPlayer: this.cardsPerPlayer,
            players: [...this.players],
            targetScore: this.targetScore,
            scores: [...this.scores],
            ...(roundMemento !== undefined ? { currentRound: roundMemento } : { currentRound: undefined as any }),
        } as GameMemento;
    }

    private attachRoundHandlers(): void {
        if (!this.presentRound) return;
        if (!this.presentRound.hasEnded()) return;

        const winner = this.presentRound.winner();
        if (winner === undefined) return;

        const pts = this.presentRound.score() ?? 0;
        this.scores[winner] += pts;

        if (this.scores[winner] >= this.targetScore) {
            this.presentRound = undefined;
            return;
        }

        this.startNewRound();
    }
    private startNewRound() {
        const dealer = this.randomizer(this.playerCount);
        this.presentRound = makeRound(this.players, dealer, this.shuffler, this.cardsPerPlayer);
    }

}


export type GameMemento = {
    cardsPerPlayer: number,
    players: string[],
    targetScore: number,
    scores: number[],
    currentRound?: {
        players: string[],
        hands: Card[][]
        drawPile: Card[],
        discardPile: Card[],
        currentColor: Color,
        currentDirection: string,
        dealer: number,
        playerInTurn: number
    }
}

export const makeGame:MakeGame = (randomizer: Randomizer, shuffler: Shuffler<Card>, cardsPerPlayer: number, players: string[]|undefined, targetScore: number|undefined) => new GameImplementation(players,targetScore,randomizer,shuffler,cardsPerPlayer)