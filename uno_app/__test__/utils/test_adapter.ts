import { 
  Card,
  toCard,
  createInitialDeck as createInitial,
  makeDeck
} from '../../src/model/deck';

import type { Deck } from '../../src/model/interfaces/deck_interface';
import type { Game } from '../../src/model/interfaces/game_interface';
import type { Round } from '../../src/model/interfaces/round_interface';

import { makeRound } from '../../src/model/round';
import { makePlayerHand, PlayerHand } from '../../src/model/player_hand';
import { makeGame } from '../../src/model/uno';

import {
  Randomizer,
  Shuffler,
  standardRandomizer,
  standardShuffler
} from '../../src/utils/random_utils';

// ===== Deck helpers =====
export function createInitialDeck(): Deck {
  return createInitial();
}

export function createDeckFromMemento(cards: ReadonlyArray<Record<string, string | number>>): Deck {
  return makeDeck([...cards]);
}

// ===== Round helpers =====
export type HandConfig = {
  players: string[];
  dealer: number;
  shuffler?: Shuffler<Card>;
  cardsPerPlayer?: number;
};

export function createRound({
  players,
  dealer,
  shuffler = standardShuffler,
  cardsPerPlayer = 7
}: HandConfig): Round {
  return makeRound(players, dealer, shuffler, cardsPerPlayer);
}

export function createRoundFromMemento(
  memento: any,
  shuffler: Shuffler<Card> = standardShuffler
): Round {
  // ---------- strict validations ----------
  // players
  if (!Array.isArray(memento?.players)) {
    throw new Error("Invalid memento: players must be an array");
  }
  const players: unknown[] = memento.players;
  if (players.length < 2) {
    throw new Error("Invalid memento: need at least 2 players");
  }
  if (players.length > 10) {
    throw new Error("Invalid memento: at most 10 players");
  }

  // hands
  if (!Array.isArray(memento.hands)) {
    throw new Error("Invalid memento: hands must be an array");
  }
  const hands: unknown[] = memento.hands;
  if (hands.length !== players.length) {
    throw new Error("Invalid memento: hands must match players");
  }
  // count winners and ensure each hand is an array
  let winners = 0;
  for (const h of hands) {
    if (!Array.isArray(h)) {
      throw new Error("Invalid memento: each hand must be an array");
    }
    if (h.length === 0) winners++;
  }
  if (winners > 1) {
    throw new Error("Invalid memento: more than one winner");
  }

  // piles
  if (!Array.isArray(memento.discardPile) || memento.discardPile.length === 0) {
    throw new Error("Invalid memento: empty discard pile");
  }
  if (!Array.isArray(memento.drawPile)) {
    throw new Error("Invalid memento: drawPile must be an array");
  }

  // color rules
  const validColors = ['RED', 'YELLOW', 'GREEN', 'BLUE'] as const;
  if (memento.currentColor !== undefined && memento.currentColor !== null) {
    if (!validColors.includes(memento.currentColor)) {
      throw new Error("Invalid memento: currentColor");
    }
    const top = toCard(memento.discardPile[0]);
    if ((top as any).color && (top as any).color !== memento.currentColor) {
      throw new Error("Invalid memento: inconsistent currentColor");
    }
  }

  // dealer
  if (typeof memento.dealer !== 'number') {
    throw new Error("Invalid memento: dealer must be a number");
  }
  if (memento.dealer < 0 || memento.dealer >= players.length) {
    throw new Error("Invalid memento: dealer out of bounds");
  }

  // finished vs playerInTurn
  const finished = winners === 1;
  if (!finished) {
    if (typeof memento.playerInTurn !== 'number') {
      throw new Error("Invalid memento: missing playerInTurn");
    }
    if (memento.playerInTurn < 0 || memento.playerInTurn >= players.length) {
      throw new Error("Invalid memento: playerInTurn out of bounds");
    }
  }

  // ---------- build a real Round without constructor shuffle ----------
  const noopShuffler: Shuffler<Card> = () => {};
  const round = makeRound(memento.players, memento.dealer, noopShuffler, 7);

  // ---------- hydrate state ----------
  (round as any).players = [...memento.players];
  (round as any).playerCount = memento.players.length;
  (round as any).dealer = memento.dealer;

  (round as any).direction =
    memento.currentDirection === 'counterclockwise' ? -1 : +1;
  (round as any).currentDirection =
    memento.currentDirection === 'counterclockwise'
      ? 'counterclockwise'
      : 'clockwise';
  (round as any).currentColor = memento.currentColor ?? '';

  (round as any).discardDeck = makeDeck([...(memento.discardPile || [])]);
  (round as any).drawDeck = makeDeck([...(memento.drawPile || [])]);

  (round as any).playerHands = (memento.hands || []).map(
    (h: ReadonlyArray<Record<string, string | number>>) =>
      makePlayerHand(h.map(toCard))
  );

  // real shuffler only after hydration so constructor doesn’t trigger it
  (round as any).shuffler = shuffler;

  (round as any).cardsPerPlay = undefined;
  (round as any).startResolved = true;
  (round as any).currentPlayerIndex = finished ? undefined : memento.playerInTurn;

  // UNO book-keeping expected by methods
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  const derivedPrev =
    typeof memento.playerInTurn === 'number'
      ? mod(memento.playerInTurn - (round as any).direction, memento.players.length)
      : null;

  (round as any).lastActor =
    typeof memento.lastActor === 'number' || memento.lastActor === null
      ? memento.lastActor
      : derivedPrev;

  (round as any).lastUnoSayer =
    typeof memento.lastUnoSayer === 'number' || memento.lastUnoSayer === null
      ? memento.lastUnoSayer
      : null;

  (round as any).pendingUnoAccused = null;
  (round as any).unoProtectedForWindow = false;
  (round as any).unoSayersSinceLastAction = new Set<number>();
  (round as any).endCallbacks = [];

  return round;
}

// ===== Game helpers =====
export type GameConfig = {
  players: string[];
  targetScore: number;
  randomizer: Randomizer;
  shuffler: Shuffler<Card>;
  cardsPerPlayer: number;
};

export function createGame(props: Partial<GameConfig>): Game {
  return makeGame(
    props.randomizer ?? standardRandomizer,
    props.shuffler ?? standardShuffler,
    props.cardsPerPlayer ?? 7,
    props.players,
    props.targetScore
  );
}

export function createGameFromMemento(
  memento: any,
  randomizer: Randomizer = standardRandomizer,
  shuffler: Shuffler<Card> = standardShuffler
): Game {
  // ----- validations -----
  if (!Array.isArray(memento.players) || memento.players.length < 2) {
    throw new Error('Invalid game memento: need at least 2 players');
  }
  if (!Array.isArray(memento.scores) || memento.scores.length !== memento.players.length) {
    throw new Error('Invalid game memento: scores must match players length');
  }
  if (typeof memento.targetScore !== 'number' || memento.targetScore <= 0) {
    throw new Error('Invalid game memento: targetScore must be > 0');
  }
  if (memento.scores.some((s: number) => s < 0)) {
    throw new Error('Invalid game memento: scores must be non-negative');
  }
  const winners = memento.scores.filter((s: number) => s >= memento.targetScore).length;
  if (winners > 1) {
    throw new Error('Invalid game memento: more than one winner');
  }
  const finished = memento.scores.some((s: number) => s >= memento.targetScore);
  if (!finished && memento.currentRound === undefined) {
    throw new Error('Invalid game memento: missing currentRound');
  }
  if (finished && memento.currentRound !== undefined) {
    throw new Error('Invalid game memento: unexpected currentRound for finished game');
  }

  // ----- build a real Game, then hydrate it -----
  const game = makeGame(
    randomizer,
    shuffler,
    memento.cardsPerPlayer ?? 7,
    memento.players,
    memento.targetScore
  );

  // overwrite internal state to match the memento
  (game as any).scores = [...memento.scores];

  (game as any).presentRound = finished
    ? undefined
    : createRoundFromMemento(memento.currentRound, shuffler);

  // if your implementation tracks these separately, keep them in sync
  (game as any).playerCount = memento.players.length;
  (game as any).targetScore = memento.targetScore;

  return game;
}