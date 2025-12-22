
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, MissionData, EnemyData, BulletData } from './types';
import { generateMission } from './services/geminiService';
import { Arena } from './components/Arena';
import { Player } from './components/Player';
import { Enemy } from './components/Enemy';
import { Bullet } from './components/Bullet';
import { Crosshair, Shield, Zap, Target, Play, RefreshCw, Loader2 } from 'lucide-react';
import * as THREE from 'three';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const [bullets, setBullets] = useState<BulletData[]>([]);
  
  // Use a ref for player position to allow enemies to track the player without triggering re-renders
  const playerPosRef = useRef(new THREE.Vector3(0, 2.5, 0));

  const startNewGame = async () => {
    setGameState(GameState.LOADING);
    try {
      const newMission = await generateMission();
      setMission(newMission);
      setScore(0);
      setHealth(100);
      setEnemies([]);
      setBullets([]);
      setGameState(GameState.PLAYING);
    } catch (err) {
      console.error("Game start failed", err);
      // Fallback in case of API failure
      setGameState(GameState.PLAYING);
    }
  };

  const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
    const id = Math.random().toString(36).substring(7);
    setBullets(prev => [...prev, {
      id,
      position: [pos.x, pos.y, pos.z],
      velocity: [dir.x, dir.y, dir.z]
    }]);
  }, []);

  const handleBulletExpiry = useCallback((bulletId: string) => {
    setBullets(prev => prev.filter(b => b.id !== bulletId));
  }, []);

  const spawnEnemy = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 45;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const id = Math.random().toString(36).substring(7);
    setEnemies(prev => [...prev, { id, position: [x, 2, z], health: 100 }]);
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const interval = setInterval(spawnEnemy, 1800);
      return () => clearInterval(interval);
    }
  }, [gameState, spawnEnemy]);

  const handleEnemyReachPlayer = useCallback((enemyId: string) => {
    setHealth(prev => {
      const newHealth = Math.max(0, prev - 15);
      if (newHealth <= 0 && gameState === GameState.PLAYING) {
        setGameState(GameState.GAMEOVER);
      }
      return newHealth;
    });
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
  }, [gameState]);

  // Handle collision detection between bullets and enemies
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const checkCollisions = () => {
      setBullets(currentBullets => {
        let bulletsToRemove: string[] = [];
        let enemiesToRemove: string[] = [];

        currentBullets.forEach(bullet => {
          const bPos = new THREE.Vector3(...bullet.position);
          enemies.forEach(enemy => {
            const ePos = new THREE.Vector3(...enemy.position);
            if (bPos.distanceTo(ePos) < 2.5) {
              bulletsToRemove.push(bullet.id);
              enemiesToRemove.push(enemy.id);
              setScore(s => s + 100);
            }
          });
        });

        if (enemiesToRemove.length > 0) {
          setEnemies(prev => prev.filter(e => !enemiesToRemove.includes(e.id)));
          return currentBullets.filter(b => !bulletsToRemove.includes(b.id));
        }
        return currentBullets;
      });
    };

    const interval = setInterval(checkCollisions, 80);
    return () => clearInterval(interval);
  }, [enemies, gameState]);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white overflow-hidden select-none">
      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md text-white">
          <div className="max-w-md w-full p-8 border border-cyan-500/40 bg-slate-900/80 rounded-xl text-center shadow-[0_0_80px_rgba(6,182,212,0.15)]">
            <h1 className="text-6xl font-black text-cyan-400 mb-2 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">NEON STRIKE</h1>
            <p className="text-pink-500 font-bold mb-10 uppercase tracking-[0.2em] text-xs">Tactical Gemini Arena</p>
            <div className="space-y-5 mb-10 text-left">
              <div className="flex items-center gap-4 text-cyan-100/80">
                <div className="p-2 bg-cyan-500/10 rounded-lg"><Crosshair className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <div className="font-bold text-sm uppercase">Neural Targeting</div>
                  <div className="text-[10px] opacity-60">LMB to discharge plasma cells</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-cyan-100/80">
                <div className="p-2 bg-cyan-500/10 rounded-lg"><Zap className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <div className="font-bold text-sm uppercase">Vector Movement</div>
                  <div className="text-[10px] opacity-60">WASD to navigate the grid</div>
                </div>
              </div>
            </div>
            <button
              onClick={startNewGame}
              className="group relative w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <div className="flex items-center justify-center gap-2">
                <Play className="w-5 h-5 fill-current" />
                Initialize Mission
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
          <div className="text-cyan-400 animate-pulse uppercase tracking-[0.3em] text-sm">
            Establishing Neural Link...
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 border border-pink-500/40 bg-slate-900/80 rounded-xl text-center shadow-[0_0_80px_rgba(236,72,153,0.15)]">
            <h2 className="text-4xl font-black text-pink-500 mb-2 tracking-tighter">CONNECTION LOST</h2>
            <div className="text-sm text-slate-400 mb-8 uppercase tracking-widest font-bold">Mission Failed</div>
            <div className="flex justify-between items-center p-4 bg-black/40 rounded-lg border border-white/5 mb-8">
              <div className="text-left">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Data Harvested</div>
                <div className="text-2xl font-bold text-cyan-400">{score}</div>
              </div>
              <Target className="w-8 h-8 text-pink-500/40" />
            </div>
            <button
              onClick={startNewGame}
              className="w-full py-4 bg-pink-500 hover:bg-pink-400 text-white font-black uppercase tracking-widest rounded-lg transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Reboot System
              </div>
            </button>
          </div>
        </div>
      )}

      {/* HUD Overlays */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAMEOVER) && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Top HUD */}
          <div className="p-6 flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-cyan-500/50 flex items-center justify-center bg-cyan-500/10">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest">Neural Stability</div>
                  <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_10px_#06b6d4]" 
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-pink-500/60 uppercase tracking-widest">Credits Earned</div>
              <div className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{score.toLocaleString()}</div>
            </div>
          </div>

          {/* Mission Stats */}
          {mission && gameState === GameState.PLAYING && (
            <div className="absolute bottom-6 left-6 max-w-xs p-4 border-l-2 border-cyan-500 bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="text-[10px] font-black text-cyan-400 uppercase mb-1">{mission.title}</div>
              <div className="text-[10px] text-slate-400 leading-tight uppercase font-medium">{mission.objective}</div>
            </div>
          )}

          {/* Crosshair UI */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute w-1 h-1 bg-cyan-400 rounded-full" />
              <div className="absolute top-0 w-[1px] h-3 bg-cyan-500/50" />
              <div className="absolute bottom-0 w-[1px] h-3 bg-cyan-500/50" />
              <div className="absolute left-0 w-3 h-[1px] bg-cyan-500/50" />
              <div className="absolute right-0 w-3 h-[1px] bg-cyan-500/50" />
            </div>
          </div>
        </div>
      )}

      {/* 3D Scene Container */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAMEOVER) && (
        <div className="absolute inset-0">
          <Canvas shadows camera={{ position: [0, 2.5, 0], fov: 75 }}>
            <Suspense fallback={null}>
              <Arena />
              <Player onShoot={handleShoot} onUpdatePosition={(pos) => playerPosRef.current.copy(pos)} />
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
