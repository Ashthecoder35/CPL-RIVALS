export type Tier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

export interface Player {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  tier: Tier;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  captain: string;
  budget: number;
  players: Player[];
  color: string;
}

export interface DraftState {
  players: Player[];
  teams: Team[];
  isStarted: boolean;
  isPaused: boolean;
  round: number;
  turnIndex: number; // Index in the snake order
  timer: number;
  snakeOrder: string[]; // Team IDs
  lastDraftEvent?: {
    player: Player;
    team: Team;
    tier: Tier;
  };
}

export type UserRole = 'Admin' | 'Captain' | 'Player';
