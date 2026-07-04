export interface Card {
  code: string;
  octgnid: string;
  name: string;
  type_code: string;
  type_name: string;
  section: string;
  sphere_code: string;
  sphere_name: string;
  cost: number | null;
  threat: number | null;
  willpower: number;
  attack: number;
  defense: number;
  health: number;
  deck_limit: number;
  is_unique: boolean;
  traits: string;
  text: string;
  pack_name: string;
  pack_code: string;
  imagesrc: string;
}

export type DeckMap = Map<string, number>; // card.code → qty

export interface DeckState {
  heroes: Card[];
  deck: DeckMap;
}

export type Phase = "heroes" | "deck";
