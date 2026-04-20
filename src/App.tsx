/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Trophy, Users, Timer as TimerIcon, Shield, Lock, Play, RotateCcw, Pause, UserPlus } from 'lucide-react';
import { DraftState, Player, Team, UserRole, Tier } from './types';
import { cn } from './lib/utils';

// --- Improved Components ---

const TechnicalOverlay = () => (
  <>
    <div className="tech-grid" />
    <div className="slanted-bg" />
    <div className="scan-line" />
    <div className="fixed top-4 left-4 text-[10px] font-orbitron opacity-40 pointer-events-none uppercase tracking-tighter">
      CPL_RIVALS // PROTOCOL: v2.0<br/>
      SESSION_TOKEN: {new Date().getTime().toString(16).toUpperCase()}
    </div>
  </>
);

const Logo = ({ className, size = "h-10" }: { className?: string; size?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <img 
      src="/logo.png" 
      alt="CPL RIVALS" 
      className={cn(size, "w-auto drop-shadow-[0_0_20px_#00BDFF]")}
      referrerPolicy="no-referrer"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://picsum.photos/seed/cricket/200/200";
      }}
    />
  </div>
);

const Preloader = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0E11] overflow-hidden"
  >
    <TechnicalOverlay />
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: [0.8, 1.05, 1], 
        opacity: 1,
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="mb-12"
    >
      <Logo size="h-64" />
    </motion.div>
    
    <div className="w-80 space-y-4">
      <div className="flex justify-between text-xs font-burbank-black text-fortnite-blue uppercase">
        <span>Initializing...</span>
        <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>{">>>>"}</motion.span>
      </div>
      <div className="h-2 bg-zinc-900 overflow-hidden relative border border-white/5">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-fortnite-blue shadow-[0_0_20px_#00BDFF]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />
      </div>
      <div className="text-[10px] font-orbitron text-zinc-600 text-center uppercase tracking-[0.2em] opacity-40">
        Multiplayer Sync Active
      </div>
    </div>
  </motion.div>
);

const Cutscene = ({ text, subtext }: { text: string; subtext?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
    >
      {/* Cinematic Flash Effect */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-white z-20"
      />

      {/* Background Animated Stripes */}
      <div className="absolute inset-0 z-0 overflow-hidden flex flex-col justify-around opacity-10">
        {[...Array(10)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
            className="h-2 bg-blue-500 w-full"
          />
        ))}
      </div>

      <motion.div 
        initial={{ scale: 3, opacity: 0, filter: "blur(10px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        exit={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="mb-4 h-1 w-20 bg-fortnite-yellow shadow-[0_0_20px_#FFF000]" />

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 0.6 }}
          className="text-2xl font-burbank-black text-fortnite-blue mb-2 uppercase"
        >
          {subtext || "ALERT"}
        </motion.p>
        
        <motion.h1 
          className="text-8xl md:text-[12rem] font-burbank-black text-white neon-glow-blue leading-none"
          initial={{ letterSpacing: "1em" }}
          animate={{ letterSpacing: "0.05em" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {text}
        </motion.h1>

        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "200%" }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="h-[4px] bg-gradient-to-r from-transparent via-white to-transparent mt-12 opacity-50 shadow-[0_0_20px_white]"
        />
      </motion.div>

      {/* Particle Explosions */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ x: "50%", y: "50%", scale: 1, opacity: 1 }}
            animate={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`, 
              scale: 0, 
              opacity: 0,
              rotate: 360
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-2 h-2 bg-blue-400"
          />
        ))}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<DraftState | null>(null);
  const [role, setRole] = useState<UserRole>('Player');
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [showCutscene, setShowCutscene] = useState<{ text: string, sub: string } | null>(null);

  const [showAuth, setShowAuth] = useState(true);
  const [adminPass, setAdminPass] = useState('');
  const [captainCode, setCaptainCode] = useState('');

  // Admin CRUD states
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({ name: '', role: 'Batsman', basePrice: 100, tier: 'Silver' });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ name: '', captain: '', budget: 1000, color: '#3ABEFF' });
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => console.log('Connected to server'));
    s.on('state:update', (newState: DraftState) => {
      setState(newState);
      setLoading(false);
    });

    s.on('event:draft_start', () => {
      triggerCutscene("DRAFT LIVE", "COMMAND START");
    });

    s.on('event:round_start', ({ round }) => {
      triggerCutscene(`ROUND ${round}`, "SNAKE PROTOCOL");
    });

    s.on('event:player_drafted', (event) => {
      triggerCutscene(event.player.name.toUpperCase(), `SECURED BY ${event.team.name.toUpperCase()}`);
    });

    return () => { s.disconnect(); };
  }, []);

  const triggerCutscene = (text: string, sub: string) => {
    setShowCutscene({ text, sub });
    setTimeout(() => setShowCutscene(null), 3000);
  };

  const currentTurnTeamId = state?.snakeOrder[state?.turnIndex ?? 0];
  const isMyTurn = role === 'Captain' && myTeamId === currentTurnTeamId && state?.isStarted && !state?.isPaused;

  const handleAdminAuth = () => {
    if (adminPass === 'admin') {
      setRole('Admin');
      setShowAuth(false);
    } else {
      setAuthError('INVALID CREDENTIALS');
    }
  };

  const handleCaptainAuth = () => {
    if (captainCode.startsWith('TEAM')) {
      const tid = captainCode.toLowerCase();
      setRole('Captain');
      setMyTeamId(tid);
      setShowAuth(false);
    } else {
      setAuthError('INVALID UNIT CODE');
    }
  };

  const handleAddPlayer = () => {
    if (socket && newPlayer.name) {
      socket.emit('admin:add_player', newPlayer);
      setNewPlayer({ name: '', role: 'Batsman', basePrice: 100, tier: 'Silver' });
    }
  };

  const handleAddTeam = () => {
    if (socket && newTeam.name) {
      socket.emit('admin:add_team', newTeam);
      setNewTeam({ name: '', captain: '', budget: 1000, color: '#3ABEFF' });
    }
  };

  const draftPlayer = (playerId: string) => {
    if (!socket || !isMyTurn) return;
    socket.emit('draft:pick', { playerId, teamId: myTeamId });
  };

  if (loading) return <Preloader />;

  return (
    <div className="min-h-screen relative">
      <TechnicalOverlay />

      <AnimatePresence>
        {showCutscene && <Cutscene text={showCutscene.text} subtext={showCutscene.sub} />}
      </AnimatePresence>

      {/* --- Game HUD --- */}
      <nav className="h-20 px-8 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/5 z-40">
        <Logo />
        
        <div className="flex items-center gap-16">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <span className="text-xs font-burbank-black text-fortnite-blue/70 uppercase">Next Up</span>
            <div className="flex gap-2 mt-1">
              {state?.snakeOrder.slice(state.turnIndex, state.turnIndex + 3).map((tid, i) => (
                <div key={i} className={cn("w-3 h-3 skew-x-12", i === 0 ? "bg-fortnite-yellow" : "bg-zinc-800")} />
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-[10px] font-burbank-black text-fortnite-blue/60 uppercase">Round</span>
              <p className="text-3xl font-burbank-black leading-none text-white tracking-widest">{state?.round}</p>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="text-center w-24">
              <span className="text-[10px] font-burbank-black text-fortnite-blue/60 uppercase">Time</span>
              <p className={cn("text-4xl font-burbank-black leading-none tracking-widest", (state?.timer ?? 0) <= 10 ? "text-red-500 animate-pulse" : "text-fortnite-yellow")}>
                {state?.timer}S
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
      <div className="text-right">
        <span className="text-[10px] font-burbank-black text-fortnite-blue/60 uppercase">{role}</span>
        <p className="text-sm font-burbank-black tracking-widest text-white leading-none">
          {myTeamId ? state?.teams.find(t => t.id === myTeamId)?.name : 'SPECTATOR'}
        </p>
      </div>
          <button onClick={() => setShowAuth(true)} className="p-3 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-colors">
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* --- Main Arena --- */}
      <main className="max-w-[1920px] mx-auto p-10 grid grid-cols-12 gap-10">
        
        {/* --- Left: Command Center --- */}
        <aside className="col-span-12 lg:col-span-3 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-fortnite-blue" />
                <h3 className="text-2xl text-fortnite-blue">Command</h3>
              </div>
              {role === 'Admin' && (
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className="text-xs font-burbank-black text-fortnite-yellow hover:underline"
                >
                  {showAdminPanel ? "CLOSE_CMD" : "OPEN_CMD"}
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {showAdminPanel && role === 'Admin' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-6 mb-6"
                >
                  {/* --- Add Player --- */}
                  <div className="game-card p-4 space-y-3 bg-blue-500/5">
                    <h4 className="text-xs font-orbitron text-blue-400 uppercase">Deploy Player</h4>
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-2 text-xs font-orbitron text-white outline-none focus:border-blue-500"
                      placeholder="PLAYER_NAME"
                      value={newPlayer.name}
                      onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        className="bg-black/50 border border-white/10 p-2 text-[10px] font-orbitron text-white outline-none"
                        value={newPlayer.role}
                        onChange={e => setNewPlayer({...newPlayer, role: e.target.value as Player['role']})}
                      >
                        <option>Batsman</option>
                        <option>Bowler</option>
                        <option>All-rounder</option>
                        <option>Wicket-keeper</option>
                      </select>
                      <select 
                        className="bg-black/50 border border-white/10 p-2 text-[10px] font-orbitron text-white outline-none"
                        value={newPlayer.tier}
                        onChange={e => setNewPlayer({...newPlayer, tier: e.target.value as Tier})}
                      >
                        <option>Platinum</option>
                        <option>Gold</option>
                        <option>Silver</option>
                        <option>Bronze</option>
                      </select>
                    </div>
                    <input 
                      type="number"
                      className="w-full bg-black/50 border border-white/10 p-2 text-xs font-orbitron text-white outline-none focus:border-blue-500"
                      placeholder="PRICE_K"
                      value={newPlayer.basePrice}
                      onChange={e => setNewPlayer({...newPlayer, basePrice: parseInt(e.target.value)})}
                    />
                    <button onClick={handleAddPlayer} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bebas tracking-widest text-sm">ADD_ASSET</button>
                  </div>

                  {/* --- Add Team --- */}
                  <div className="game-card p-4 space-y-3 bg-purple-500/5">
                    <h4 className="text-xs font-orbitron text-purple-400 uppercase">Deploy Division</h4>
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-2 text-xs font-orbitron text-white outline-none focus:border-purple-500"
                      placeholder="TEAM_NAME"
                      value={newTeam.name}
                      onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    />
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-2 text-xs font-orbitron text-white outline-none focus:border-purple-500"
                      placeholder="CAPTAIN_NAME"
                      value={newTeam.captain}
                      onChange={e => setNewTeam({...newTeam, captain: e.target.value})}
                    />
                    <button onClick={handleAddTeam} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bebas tracking-widest text-sm">ACTIVATE_DIV</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn("space-y-3", role !== 'Admin' && "opacity-40 cursor-not-allowed grayscale")}>
              <AdminButton 
                active={!state?.isStarted}
                label="Initialize Draft" 
                icon={<Play />} 
                onClick={() => socket?.emit('admin:start')} 
              />
              <AdminButton 
                active={state?.isStarted}
                label={state?.isPaused ? "Resume" : "Pause"} 
                icon={<Pause />} 
                onClick={() => socket?.emit('admin:pause')} 
              />
              <AdminButton 
                active={state?.isStarted}
                label="Full Reset" 
                icon={<RotateCcw />} 
                onClick={() => socket?.emit('admin:reset')} 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-lg text-blue-400/80">Queue Matrix</h3>
            </div>
            <div className="game-card p-4 space-y-2">
              {state?.snakeOrder.map((tid, idx) => {
                const team = state.teams.find(t => t.id === tid);
                const isCurrent = idx === state.turnIndex;
                return (
                  <div key={idx} className={cn("p-2 flex items-center justify-between border-l-2 transition-all", isCurrent ? "border-blue-400 bg-blue-400/10 text-white" : "border-transparent text-zinc-600")}>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-orbitron">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-bold tracking-tight uppercase leading-none">{team?.name}</span>
                    </div>
                    {isCurrent && <div className="w-1.5 h-1.5 bg-blue-400 animate-ping rounded-full" />}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* --- Center: Athlete Roster --- */}
        <section className="col-span-12 lg:col-span-6 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-xl text-blue-400/80">Talent Pool</h3>
            </div>
            <div className="flex gap-4 text-[10px] font-orbitron text-zinc-500 uppercase">
              <span>Verified Units: {state?.players.length}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state?.players.map((player) => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                canDraft={isMyTurn}
                isAdmin={role === 'Admin'}
                onDraft={() => draftPlayer(player.id)}
                onDelete={() => socket?.emit('admin:delete_player', player.id)}
                onManualAssign={(tid) => socket?.emit('admin:manual_assign', { playerId: player.id, teamId: tid })}
                teams={state.teams}
              />
            ))}
          </div>
        </section>

        {/* --- Right: Squad Roster --- */}
        <aside className="col-span-12 lg:col-span-3 space-y-8">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-purple-400" />
            <h3 className="text-lg text-purple-400/80">Squad Ops</h3>
          </div>
          <div className="space-y-6">
            {state?.teams.map((team) => (
              <TeamCard 
                key={team.id} 
                team={team} 
                isCurrent={team.id === currentTurnTeamId}
                isAdmin={role === 'Admin'}
                onDelete={() => socket?.emit('admin:delete_team', team.id)}
              />
            ))}
          </div>
        </aside>
      </main>

      {/* --- Authentication Portal --- */}
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0B0E11]/95 backdrop-blur-2xl"
          >
            <TechnicalOverlay />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-fortnite-blue/30 p-10 relative overflow-hidden"
              style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-[2px] bg-fortnite-purple shadow-[0_0_15px_#AF26FF]" />
              
              <div className="text-center mb-10">
                <Logo size="h-24" className="justify-center mb-6" />
                <h2 className="text-5xl text-white tracking-tight">Identity Scan</h2>
                {authError && <p className="text-red-500 text-xs font-burbank-black mt-2 animate-pulse">{authError}</p>}
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-xs font-burbank-black text-fortnite-blue/60 uppercase block mb-2">Unit Command Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ENTER_ID..." 
                      className="flex-1 bg-black/50 border border-white/10 p-3 font-burbank-black text-sm focus:border-fortnite-blue outline-none transition-all uppercase"
                      value={captainCode}
                      onChange={(e) => setCaptainCode(e.target.value)}
                    />
                    <button onClick={handleCaptainAuth} className="bg-fortnite-blue hover:bg-blue-400 p-4 transition-all text-black">
                      <UserPlus className="w-5 h-5"/>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-burbank-black"><span className="px-3 bg-zinc-900 text-zinc-600">Secure Protocol</span></div>
                </div>

                <div>
                  <label className="text-xs font-burbank-black text-fortnite-purple/60 uppercase block mb-2">Admin Override</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="ACCESS_KEY..." 
                      className="flex-1 bg-black/50 border border-white/10 p-3 font-burbank-black text-sm focus:border-fortnite-purple outline-none transition-all"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                    />
                    <button onClick={handleAdminAuth} className="bg-fortnite-purple hover:bg-purple-400 p-4 transition-all text-black">
                      <Shield className="w-5 h-5"/>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => { setShowAuth(false); setRole('Player'); }} 
                  className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-burbank-black text-xs text-zinc-500 uppercase tracking-widest"
                >
                  Join as Spectator
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

const AdminButton = ({ label, icon, onClick, active }: { label: string, icon: React.ReactNode, onClick: () => void, active: boolean }) => (
  <button 
    onClick={onClick}
    disabled={!active}
    className={cn(
      "w-full h-12 flex items-center px-4 gap-4 transition-all border border-white/5 bg-zinc-950 hover:bg-white/5 group",
      !active && "opacity-30 pointer-events-none"
    )}
  >
    <div className="text-zinc-500 group-hover:text-white transition-colors">
      {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
    </div>
    <span className="text-sm font-burbank tracking-widest text-zinc-400 group-hover:text-white">{label}</span>
  </button>
);

const PlayerCard = ({ player, canDraft, isAdmin, onDraft, onDelete, onManualAssign, teams }: { player: Player, canDraft: boolean, isAdmin: boolean, onDraft: () => void, onDelete: () => void, onManualAssign: (tid: string) => void, teams: Team[], key?: React.Key }) => {
  const tierColors: Record<Tier, string> = {
    Platinum: 'border-fortnite-yellow text-fortnite-yellow',
    Gold: 'border-fortnite-purple text-fortnite-purple',
    Silver: 'border-fortnite-blue text-fortnite-blue',
    Bronze: 'border-green-500 text-green-500',
  };

  const [showAssign, setShowAssign] = useState(false);

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn("game-card p-5 group relative", tierColors[player.tier])}
    >
      {isAdmin && (
        <button onClick={onDelete} className="absolute top-2 right-2 text-red-500/50 hover:text-red-500 transition-colors">
          <RotateCcw className="w-3 h-3 rotate-45" />
        </button>
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[10px] font-orbitron opacity-40 uppercase tracking-widest mb-1 block">{player.tier} Class</span>
          <h4 className="text-4xl text-white -mt-2 tracking-tight group-hover:neon-glow-blue transition-all">{player.name}</h4>
        </div>
        <div className="text-right">
          <span className="text-xs font-burbank-black text-fortnite-blue/40 uppercase">Price</span>
          <p className="text-3xl font-burbank-black text-fortnite-yellow neon-glow-yellow">${player.basePrice.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-[10px] font-burbank-black opacity-40 uppercase">Class</span>
          <span className="text-xl font-burbank-black text-white leading-tight">{player.role}</span>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowAssign(!showAssign)}
              className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-orbitron text-zinc-500 hover:text-white"
            >
              ASSIGN
            </button>
          )}
          {canDraft ? (
            <button onClick={onDraft} className="fortnite-button">Draft Talent</button>
          ) : (
            <div className="text-[10px] font-orbitron text-zinc-700 uppercase border border-white/5 px-4 py-2 font-bold">LOCKED_SYNC</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAssign && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center z-20"
          >
            <h4 className="text-xs font-orbitron text-blue-400 mb-4">Select Target Squad</h4>
            <div className="grid grid-cols-2 gap-2 w-full">
              {teams.map(t => (
                <button 
                  key={t.id}
                  onClick={() => onManualAssign(t.id)}
                  className="p-2 border border-white/10 text-[10px] font-orbitron text-zinc-400 hover:bg-white/5"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAssign(false)} className="mt-4 text-[10px] font-orbitron text-zinc-600">CANCEL</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TeamCard = ({ team, isCurrent, isAdmin, onDelete }: { team: Team, isCurrent: boolean, isAdmin: boolean, onDelete: () => void, key?: React.Key }) => (
  <div className={cn("game-card overflow-hidden border-l-2 transition-all relative", isCurrent ? "border-blue-400 bg-blue-400/5 shadow-[0_0_30px_rgba(58,190,255,0.1)]" : "border-white/5 opacity-60")}>
    {isAdmin && (
      <button onClick={onDelete} className="absolute top-2 right-2 text-red-500/30 hover:text-red-500 transition-colors z-10">
        <RotateCcw className="w-3 h-3 rotate-45" />
      </button>
    )}
    
    <div className="p-5 flex items-center justify-between border-b border-white/5">
      <div>
        <h4 className="text-3xl text-white leading-none">{team.name}</h4>
        <span className="text-xs font-burbank-black text-fortnite-blue uppercase">{team.captain}</span>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-burbank-black text-fortnite-blue/40 uppercase">Bank</span>
        <p className="text-3xl font-burbank-black text-fortnite-yellow leading-none">${team.budget.toLocaleString()}</p>
      </div>
    </div>
    <div className="p-4 space-y-2 min-h-[100px] max-h-[150px] overflow-y-auto">
      {team.players.length === 0 ? (
        <p className="text-[10px] font-orbitron text-zinc-700 text-center py-6 uppercase">No Active Roster</p>
      ) : (
        team.players.map(p => (
          <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
            <span className="font-bold uppercase tracking-tighter">{p.name}</span>
            <span className="text-[10px] uppercase text-zinc-500">{p.tier[0]}</span>
          </div>
        ))
      )}
    </div>
    {isCurrent && (
      <div className="bg-blue-600 h-1 animate-pulse" />
    )}
  </div>
);
