
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LOADING = 'LOADING'
}

export interface MissionData {
  title: string;
  description: string;
  objective: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Nightmare';
}

export interface EnemyData {
  id: string;
  position: [number, number, number];
  health: number;
}

export interface BulletData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
}
