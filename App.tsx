
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, MissionData, EnemyData, BulletData } from './types';
import { generateMission } from './services/geminiService';
import { Arena } from './components/Arena';
import { Player } from './components/Player';
import { Enemy } from './components/Enemy';
import { Bullet } from './components/Bullet';
import { Crosshair, Shield, Zap, Target, AlertCircle, Play, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const [bullets, setBullets] = useState<BulletData[]>([]);
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 2.5, 0));
  
  const gameLoopRef = useRef<number>();

  const startNewGame = async () => {
    setGameState(GameState.LOADING);
    const newMission = await generateMission();
    setMission(newMission);
    setScore(0);
    setHealth(100);
    setEnemies([]);
    setBullets([]);
    setGameState(GameState.PLAYING);
  };

  const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
    const id = Math.random().toString(36).substring(7);
    setBullets(prev => [...prev, {
      id,
      position: [pos.x, pos.y, pos.z],
      velocity: [dir.x, dir.y, dir.z]
    }]);
  }, []);

  const handleEnemyHit = (bulletId: string, enemyId: string) => {
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
    setBullets(prev => prev.filter(b => b.id !== bulletId));
    setScore(s => s + 100);
  };

  const handleBulletExpiry = (bulletId: string) => {
    setBullets(prev => prev.filter(b => b.id !== bulletId));
  };

  const spawnEnemy = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = 40;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const id = Math.random().toString(36).substring(7);
    setEnemies(prev => [...prev, { id, position: [x, 2, z], health: 100 }]);
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const interval = setInterval(spawnEnemy, 2000);
      return () => clearInterval(interval);
    }
  }, [gameState, spawnEnemy]);

  // Damage check
  const handleEnemyReachPlayer = useCallback((enemyId: string) => {
    setHealth(prev => {
      const newHealth = prev - 10;
      if (newHealth <= 0) {
        setGameState(GameState.GAMEOVER);
        return 0;
      }
      return newHealth;
    });
    setEnemies(prev => prev.filter(e => e.id !== enemyId));
  }, []);

  // Simple Collision detection logic
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const checkCollisions = () => {
      bullets.forEach(bullet => {
        enemies.forEach(enemy => {
          const bPos = new THREE.Vector3(...bullet.position);
          const ePos = new THREE.Vector3(...enemy.position);
          if (bPos.distanceTo(ePos) < 2.5) {
            handleEnemyHit(bullet.id, enemy.id);
          }
        });
      });
    };

    const interval = setInterval(checkCollisions, 50);
    return () => clearInterval(interval);
  }, [bullets, enemies, gameState]);

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden select-none">
      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-8 border border-cyan-500/30 bg-black/60 rounded-lg text-center">
            <h1 className="text-5xl font-orbitron font-black text-cyan-400 mb-2 tracking-tighter">NEON STRIKE</h1>
            <p className="text-pink-500 font-bold mb-8 uppercase tracking-widest">Gemini Arena Pro</p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-cyan-200">
                <Crosshair className="w-5 h-5" /> <span>Precision Target Acquisition</span>
              </div>
              <div className="flex items-center gap-3 text-cyan-200">
                <Shield className="w-5 h-5" /> <span>Kinetic Shield Management</span>
              </div>
              <div className="flex items-center gap-3 text-cyan-200">
                <Zap className="w-5 h-5" /> <span>Quantum Surge Drive</span>
              </div>
            </div>
            <button 
              onClick={startNewGame}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron font-bold rounded flex items-center justify-center gap-2 transition-all transform hover:scale-105"
            >
              <Play fill="white" /> INITIATE NEURAL LINK
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cyan-400 font-orbitron animate-pulse">GENERATING MISSION PARAMETERS...</p>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/40 backdrop-blur-md">
          <div className="max-w-md w-full p-8 border-2 border-red-500/50 bg-black/90 rounded-lg text-center">
            <h2 className="text-4xl font-orbitron font-black text-red-500 mb-2">NEURAL LINK SEVERED</h2>
            <p className="text-gray-400 mb-8 uppercase tracking-widest italic">Connection lost in the Grid</p>
            <div className="bg-red-900/20 p-6 rounded mb-8 border border-red-900/30">
              <div className="text-red-400 text-sm uppercase mb-1">Final Analysis Score</div>
              <div className="text-5xl font-orbitron font-bold text-white">{score}</div>
            </div>
            <button 
              onClick={startNewGame}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold rounded flex items-center justify-center gap-2 transition-all transform hover:scale-105"
            >
              <RefreshCw /> RE-ESTABLISH CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      {gameState === GameState.PLAYING && (
        <>
          {/* Mission Info (Top Left) */}
          <div className="absolute top-6 left-6 z-40 space-y-2 pointer-events-none">
            <div className="flex items-center gap-2 text-cyan-400 font-orbitron text-xs uppercase tracking-widest border-l-4 border-cyan-500 pl-3">
              <Target className="w-4 h-4" />
              {mission?.title || 'Unknown Protocol'}
            </div>
            <p className="text-gray-400 text-sm max-w-xs">{mission?.description}</p>
            <div className="inline-block px-2 py-0.5 bg-pink-900/30 border border-pink-500/50 text-pink-400 text-[10px] font-bold uppercase rounded">
              Difficulty: {mission?.difficulty}
            </div>
          </div>

          {/* Stats (Top Right) */}
          <div className="absolute top-6 right-6 z-40 text-right pointer-events-none">
            <div className="text-cyan-400 text-xs uppercase tracking-widest font-orbitron">Arena Score</div>
            <div className="text-4xl font-orbitron font-black text-white">{score.toLocaleString()}</div>
          </div>

          {/* Health Bar (Bottom Left) */}
          <div className="absolute bottom-6 left-6 z-40 w-64 pointer-events-none">
            <div className="flex justify-between items-end mb-1">
              <span className="text-cyan-400 text-xs font-orbitron uppercase">Vital Integrity</span>
              <span className="text-white font-orbitron">{health}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
              <div 
                className={`h-full transition-all duration-300 ${health < 30 ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}
                style={{ width: `${health}%` }}
              ></div>
            </div>
          </div>

          {/* Controls Help (Bottom Right) */}
          <div className="absolute bottom-6 right-6 z-40 text-right pointer-events-none opacity-50">
            <div className="text-[10px] uppercase text-gray-500 font-orbitron">
              WASD: Move / Mouse: Look / Click: Discharge
            </div>
          </div>

          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-cyan-500/40 rounded-full scale-110"></div>
              <div className="absolute top-1/2 left-0 w-2 h-[2px] bg-cyan-400 -translate-y-1/2"></div>
              <div className="absolute top-1/2 right-0 w-2 h-[2px] bg-cyan-400 -translate-y-1/2"></div>
              <div className="absolute top-0 left-1/2 w-[2px] h-2 bg-cyan-400 -translate-x-1/2"></div>
              <div className="absolute bottom-0 left-1/2 w-[2px] h-2 bg-cyan-400 -translate-x-1/2"></div>
              <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-pink-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_#ff00ff]"></div>
            </div>
          </div>
        </>
      )}

      {/* 3D Game World */}
      <div className="w-full h-full">
        <Canvas shadows camera={{ position: [0, 2.5, 0], fov: 75 }}>
          <color attach="background" args={['#000']} />
          <Arena />
          
          {gameState === GameState.PLAYING && (
            <>
              <Player onShoot={handleShoot} />
              
              {enemies.map(enemy => (
                <Enemy 
                  key={enemy.id} 
                  id={enemy.id} 
                  position={enemy.position} 
                  onReachPlayer={() => handleEnemyReachPlayer(enemy.id)}
                  playerPosition={playerPos}
                />
              ))}

              {bullets.map(bullet => (
                <Bullet 
                  key={bullet.id}
                  id={bullet.id}
                  position={new THREE.Vector3(...bullet.position)}
                  direction={new THREE.Vector3(...bullet.velocity)}
                  onHit={handleBulletExpiry}
                />
              ))}
            </>
          )}
        </Canvas>
      </div>
    </div>
  );
};

export default App;
