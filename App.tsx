
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, MissionData, EnemyData, BulletData } from './types.ts';
import { generateMission } from './services/geminiService.ts';
import { Arena } from './components/Arena.tsx';
import { Player } from './components/Player.tsx';
import { Enemy } from './components/Enemy.tsx';
import { Bullet } from './components/Bullet.tsx';
import { Crosshair, Shield, Zap, Target, Play, RefreshCw, Loader2 } from 'lucide-react';
import * as THREE from 'three';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const [bullets, setBullets] = useState<BulletData[]>([]);
  
  const playerPosRef = useRef(new THREE.Vector3(0, 2.5, 0));

  const startNewGame = async () => {
    setGameState(GameState.LOADING);
    try {
      const newMission = await generateMission();
      setMission(newMission);
    } catch (err) {
      console.error("Game start failed", err);
      setMission({
        title: "EMERGENCY PROTOCOL",
        description: "AI Link failed. Local defense active.",
        objective: "Survive the breach.",
        difficulty: "Hard"
      });
    } finally {
      setScore(0);
      setHealth(100);
      setEnemies([]);
      setBullets([]);
      setGameState(GameState.PLAYING);
    }
  };

  const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
    if (gameState !== GameState.PLAYING) return;
    const id = Math.random().toString(36).substring(7);
    setBullets(prev => [...prev, {
      id,
      position: [pos.x, pos.y, pos.z],
      velocity: [dir.x, dir.y, dir.z]
    }]);
  }, [gameState]);

  const handleBulletExpiry = useCallback((bulletId: string) => {
    setBullets(prev => prev.filter(b => b.id !== bulletId));
  }, []);

  const spawnEnemy = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 10;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const id = Math.random().toString(36).substring(7);
    setEnemies(prev => [...prev, { id, position: [x, 2, z], health: 100 }]);
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const interval = setInterval(spawnEnemy, 1500);
      return () => clearInterval(interval);
    }
  }, [gameState, spawnEnemy]);

  const handleEnemyReachPlayer = useCallback((enemyId: string) => {
    setHealth(prev => {
      const newHealth = Math.max(0, prev - 20);
      if (newHealth <= 0) {
        setGameState(GameState.GAMEOVER);
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
      return newHealth;
    });
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
  }, []);

  // Dedicated collision detection effect
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const collisionTimer = setInterval(() => {
      setBullets(currentBullets => {
        let bulletsToRemove = new Set<string>();
        let enemiesToRemove = new Set<string>();

        currentBullets.forEach(bullet => {
          const bPos = new THREE.Vector3(...bullet.position);
          enemies.forEach(enemy => {
            const ePos = new THREE.Vector3(...enemy.position);
            // Check distance (enemies are roughly 2.5 units wide/tall)
            if (bPos.distanceTo(ePos) < 2.5) {
              bulletsToRemove.add(bullet.id);
              enemiesToRemove.add(enemy.id);
            }
          });
        });

        if (enemiesToRemove.size > 0) {
          setScore(s => s + (enemiesToRemove.size * 100));
          setEnemies(prev => prev.filter(e => !enemiesToRemove.has(e.id)));
          return currentBullets.filter(b => !bulletsToRemove.has(b.id));
        }
        return currentBullets;
      });
    }, 50);

    return () => clearInterval(collisionTimer);
  }, [enemies.length, gameState]);

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden select-none font-['Rajdhani']">
      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="max-w-md w-full p-8 border border-cyan-500/30 bg-slate-900/60 rounded-2xl text-center shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <h1 className="text-7xl font-black text-cyan-400 mb-2 tracking-tighter font-orbitron drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">NEON STRIKE</h1>
            <p className="text-pink-500 font-bold mb-12 uppercase tracking-[0.3em] text-[10px]">Neural Arena v2.5</p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                <Crosshair className="w-5 h-5 text-cyan-400 mb-2" />
                <div className="font-bold text-xs uppercase text-cyan-100">Click</div>
                <div className="text-[10px] text-slate-400">Fire Plasma</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
                <Zap className="w-5 h-5 text-pink-400 mb-2" />
                <div className="font-bold text-xs uppercase text-pink-100">WASD</div>
                <div className="text-[10px] text-slate-400">Grid Nav</div>
              </div>
            </div>

            <button
              onClick={startNewGame}
              className="group relative w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all duration-300"
            >
              <div className="flex items-center justify-center gap-2">
                <Play className="w-5 h-5 fill-current" />
                Initialize Link
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <div className="relative w-24 h-24 mb-6">
             <Loader2 className="w-full h-full text-cyan-500 animate-spin opacity-20" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_20px_#06b6d4]" />
             </div>
          </div>
          <div className="text-cyan-400 animate-pulse font-bold uppercase tracking-[0.4em] text-xs">
            Syncing Neural Nodes...
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="max-w-md w-full p-10 border border-pink-500/40 bg-slate-900/80 rounded-3xl text-center">
            <h2 className="text-5xl font-black text-pink-500 mb-2 tracking-tighter font-orbitron">LINK SEVERED</h2>
            <div className="text-xs text-slate-500 mb-10 uppercase tracking-widest font-bold italic">System Failure Imminent</div>
            
            <div className="p-6 bg-black/50 rounded-2xl border border-white/5 mb-10">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Final Score</div>
              <div className="text-5xl font-black text-white">{score}</div>
            </div>

            <button
              onClick={startNewGame}
              className="w-full py-5 bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(236,72,153,0.3)]"
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Reconnect
              </div>
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAMEOVER) && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="p-8 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-cyan-500/5">
                  <Shield className="w-7 h-7 text-cyan-400" />
                </div>
                <svg className="absolute inset-0 w-14 h-14 -rotate-90">
                  <circle
                    cx="28" cy="28" r="26"
                    fill="transparent"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeDasharray={26 * 2 * Math.PI}
                    strokeDashoffset={26 * 2 * Math.PI * (1 - health / 100)}
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Stability Status</div>
                <div className="text-2xl font-black text-white">{health}%</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Data Collected</div>
              <div className="text-4xl font-black text-white tabular-nums tracking-tighter">{score.toLocaleString()}</div>
            </div>
          </div>

          {mission && gameState === GameState.PLAYING && (
            <div className="absolute bottom-10 left-10 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-black uppercase rounded">Active Task</div>
                <div className="text-[10px] font-black text-pink-500 uppercase">{mission.difficulty}</div>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1 font-orbitron">{mission.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed uppercase">{mission.objective}</p>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border border-cyan-500/30 rounded-full animate-ping" />
              <div className="absolute top-1/2 left-0 w-4 h-[1px] bg-cyan-400" />
              <div className="absolute top-1/2 right-0 w-4 h-[1px] bg-cyan-400" />
              <div className="absolute top-0 left-1/2 w-[1px] h-4 bg-cyan-400" />
              <div className="absolute bottom-0 left-1/2 w-[1px] h-4 bg-cyan-400" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
            </div>
          </div>
        </div>
      )}

      {/* 3D Scene */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAMEOVER) && (
        <div className="absolute inset-0">
          <Canvas shadows camera={{ position: [0, 2.5, 0], fov: 75 }}>
            <Suspense fallback={null}>
              <Arena />
              <Player 
                onShoot={handleShoot} 
                onUpdatePosition={(pos) => playerPosRef.current.copy(pos)} 
              />
              {enemies.map((enemy) => (
                <Enemy
                  key={enemy.id}
                  id={enemy.id}
                  position={enemy.position}
                  onReachPlayer={() => handleEnemyReachPlayer(enemy.id)}
                  playerPosition={playerPosRef.current}
                />
              ))}
              {bullets.map((bullet) => (
                <Bullet
                  key={bullet.id}
                  id={bullet.id}
                  position={new THREE.Vector3(...bullet.position)}
                  direction={new THREE.Vector3(...bullet.velocity)}
                  onHit={handleBulletExpiry}
                />
              ))}
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default App;
