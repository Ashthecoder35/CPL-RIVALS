import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { DraftState, Player, Team } from './src/types';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;

// Initial Data
const INITIAL_PLAYERS: Player[] = [
  // Platinum ($15,000)
  { id: 'p1', name: 'Suvin Shetty', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  { id: 'p2', name: 'Ashman Mittal', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  { id: 'p3', name: 'Nachiket', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  { id: 'p4', name: 'Pranjal', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  { id: 'p5', name: 'Vivaan Nair', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  { id: 'p6', name: 'Rishaan Shetty', role: 'Batsman', basePrice: 15000, tier: 'Platinum' },
  
  // Gold ($8,000)
  { id: 'g1', name: 'Vimarsh', role: 'All-rounder', basePrice: 8000, tier: 'Gold' },
  { id: 'g2', name: 'Naitik', role: 'All-rounder', basePrice: 8000, tier: 'Gold' },
  { id: 'g3', name: 'Ashrith', role: 'All-rounder', basePrice: 8000, tier: 'Gold' },
  { id: 'g4', name: 'Sai Sumanth', role: 'All-rounder', basePrice: 8000, tier: 'Gold' },
  { id: 'g5', name: 'Suchay', role: 'All-rounder', basePrice: 8000, tier: 'Gold' },

  // Silver ($4,000)
  { id: 's1', name: 'Aahil', role: 'Bowler', basePrice: 4000, tier: 'Silver' },
  { id: 's2', name: 'Gaurav', role: 'Bowler', basePrice: 4000, tier: 'Silver' },
  { id: 's3', name: 'Aadhya', role: 'Wicket-keeper', basePrice: 4000, tier: 'Silver' },
  { id: 's4', name: 'Aarit', role: 'Bowler', basePrice: 4000, tier: 'Silver' },

  // Bronze ($2,000)
  { id: 'b1', name: 'Udbhav', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b2', name: 'Keshav', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b3', name: 'Ravish', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b4', name: 'Arjun', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b5', name: 'Akshit', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b6', name: 'Agrim', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b7', name: 'Aditya Chandra', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
  { id: 'b8', name: 'Ishan', role: 'Batsman', basePrice: 2000, tier: 'Bronze' },
];

const INITIAL_TEAMS: Team[] = [
  { id: 'team1', name: 'Thunderbolts', captain: 'Captain A', budget: 50000, players: [], color: '#3ABEFF' },
  { id: 'team2', name: 'Vipers', captain: 'Captain B', budget: 50000, players: [], color: '#A855F7' },
  { id: 'team3', name: 'Strikers', captain: 'Captain C', budget: 50000, players: [], color: '#FF4E00' },
  { id: 'team4', name: 'Titans', captain: 'Captain D', budget: 50000, players: [], color: '#00FF00' },
];

let gameState: DraftState = {
  players: INITIAL_PLAYERS,
  teams: INITIAL_TEAMS,
  isStarted: false,
  isPaused: false,
  round: 1,
  turnIndex: 0,
  timer: 60,
  snakeOrder: ['team1', 'team2', 'team3', 'team4', 'team4', 'team3', 'team2', 'team1'],
};

const RESET_STATE = (): DraftState => ({
  ...gameState,
  players: [...INITIAL_PLAYERS],
  teams: INITIAL_TEAMS.map(t => ({ ...t, players: [], budget: 50000 })),
  isStarted: false,
  round: 1,
  turnIndex: 0,
  timer: 60,
  lastDraftEvent: undefined,
});

// Timer Logic
setInterval(() => {
  if (gameState.isStarted && !gameState.isPaused) {
    if (gameState.timer > 0) {
      gameState.timer -= 1;
    } else {
      nextTurn();
    }
    // Broadcast state every second to keep everyone in sync perfectly
    io.emit('state:update', gameState);
  }
}, 1000);

function nextTurn() {
  gameState.turnIndex = (gameState.turnIndex + 1) % gameState.snakeOrder.length;
  gameState.timer = 60;
  if (gameState.turnIndex === 0) {
    gameState.round += 1;
  }
  io.emit('state:update', gameState);
  io.emit('event:round_start', { round: gameState.round });
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('state:update', gameState);

  socket.on('admin:start', () => {
    gameState.isStarted = true;
    io.emit('state:update', gameState);
    io.emit('event:draft_start');
  });

  socket.on('admin:reset', () => {
    gameState = RESET_STATE();
    io.emit('state:update', gameState);
  });

  socket.on('admin:pause', () => {
    gameState.isPaused = !gameState.isPaused;
    io.emit('state:update', gameState);
  });

  // --- NEW ADMIN CAPABILITIES ---
  
  socket.on('admin:add_player', (player: Player) => {
    const newId = (gameState.players.length + gameState.teams.reduce((acc, t) => acc + t.players.length, 0) + 1).toString();
    gameState.players.push({ ...player, id: newId });
    io.emit('state:update', gameState);
  });

  socket.on('admin:delete_player', (playerId: string) => {
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    gameState.teams = gameState.teams.map(team => ({
      ...team,
      players: team.players.filter(p => p.id !== playerId)
    }));
    io.emit('state:update', gameState);
  });

  socket.on('admin:add_team', (team: Team) => {
    const newId = `team${gameState.teams.length + 1}`;
    gameState.teams.push({ ...team, id: newId, players: [] });
    // Update snake order automatically if teams change? 
    // For now let's just push and re-calculate snake order simple way
    gameState.snakeOrder = [...gameState.teams.map(t => t.id), ...[...gameState.teams].reverse().map(t => t.id)];
    io.emit('state:update', gameState);
  });

  socket.on('admin:delete_team', (teamId: string) => {
    gameState.teams = gameState.teams.filter(t => t.id !== teamId);
    gameState.snakeOrder = gameState.snakeOrder.filter(id => id !== teamId);
    io.emit('state:update', gameState);
  });

  socket.on('admin:manual_assign', ({ playerId, teamId }) => {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const teamIndex = gameState.teams.findIndex(t => t.id === teamId);
    
    if (playerIndex > -1 && teamIndex > -1) {
      const [player] = gameState.players.splice(playerIndex, 1);
      gameState.teams[teamIndex].players.push(player);
      io.emit('state:update', gameState);
    }
  });

  socket.on('draft:pick', ({ playerId, teamId }) => {
    const currentTeamId = gameState.snakeOrder[gameState.turnIndex];
    if (teamId !== currentTeamId) return;

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const teamIndex = gameState.teams.findIndex(t => t.id === teamId);

    if (playerIndex > -1 && teamIndex > -1) {
      const player = gameState.players[playerIndex];
      const team = gameState.teams[teamIndex];

      if (team.budget >= player.basePrice) {
        // Successful Draft
        const [draftedPlayer] = gameState.players.splice(playerIndex, 1);
        draftedPlayer.teamId = teamId;
        team.players.push(draftedPlayer);
        team.budget -= draftedPlayer.basePrice;

        gameState.lastDraftEvent = {
          player: draftedPlayer,
          team: team,
          tier: draftedPlayer.tier
        };

        io.emit('event:player_drafted', gameState.lastDraftEvent);
        nextTurn();
      }
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
