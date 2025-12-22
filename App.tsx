
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Grid, Sky, Stars, MeshWobbleMaterial } from '@react-three/drei';
import { Crosshair, Shield, Zap, Target, Play, RefreshCw, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { GameState, MissionData, EnemyData, BulletData } from './types';
import { generateMission } from './services/geminiService';

// --- Sub-components moved here for maximum boot reliability ---

const Arena: React.FC = () => {
  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" metalness={0.8} roughness={0.2} />
      </mesh>
      <Grid
        infiniteGrid
        fadeDistance={50}
        sectionColor="#00ffff"
        sectionSize={5}
        sectionThickness={1}
        cellColor="#ff00ff"
        cellSize={1}
        cellThickness={0.5}
      />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 15, 10]} intensity={500} color="#00ffff" />
      <pointLight position={[-10, 15, -10]} intensity={500} color="#ff00ff" />
    </>
  );
};

const Player: React.FC<{ 
  onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void;
  onUpdatePosition: (pos: THREE.Vector3) => void;
}> = ({ onShoot, onUpdatePosition }) => {
  const { camera } = useThree();
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const velocity = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveState.current.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveState.current.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveState.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveState.current.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveState.current.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveState.current.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveState.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveState.current.right = false;
    };
    const handleMouseDown = () => {
      if (document.pointerLockElement) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        onShoot(camera.position.clone(), dir);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [camera, onShoot]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const speed = 400;
    const friction = 10;
    
    velocity.current.x -= velocity.current.x * friction * dt;
    velocity.current.z -= velocity.current.z * friction * dt;

    const dirZ = Number(moveState.current.forward) - Number(moveState.current.backward);
    const dirX = Number(moveState.current.right) - Number(moveState.current.left);

    if (dirZ !== 0) velocity.current.z -= dirZ * speed * dt;
    if (dirX !== 0) velocity.current.x -= dirX * speed * dt;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up);

    camera.position.addScaledVector(forward, -velocity.current.z * dt * 0.1);
    camera.position.addScaledVector(right, velocity.current.x * dt * 0.1);
    camera.position.y = 2.5;

    onUpdatePosition(camera.position);
  });

  return (
    <>
      <PointerLockControls />
      <mesh position={[0.4, -0.4, -0.8]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.12, 0.2, 0.6]} />
        <meshStandardMaterial color="#111" metalness={1} roughness={0} emissive="#00ffff" emissiveIntensity={0.1} />
      </mesh>
    </>
  );
};

const Enemy: React.FC<{ 
  position: [number, number, number]; 
  playerPosition: THREE.Vector3;
  onReachPlayer: () => void;
}> = ({ position, playerPosition, onReachPlayer }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const currentPos = useRef(new THREE.Vector3(...position));

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dir = new THREE.Vector3().subVectors(playerPosition, currentPos.current);
    if (dir.length() < 2.5) {
      onReachPlayer();
      return;
    }
    dir.normalize();
    currentPos.current.addScaledVector(dir, 6 * delta);
    ref.current.position.copy(currentPos.current);
    ref.current.rotation.y += delta * 3;
    ref.current.rotation.x += delta;
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[1.2, 0]} />
      <MeshWobbleMaterial color="#ff00ff" factor={1} speed={4} emissive="#ff00ff" emissiveIntensity={3} />
    </mesh>
  );
};

const Bullet: React.FC<{ 
  id: string; 
  position: THREE.Vector3; 
  velocity: THREE.Vector3; 
  onHit: (id: string) => void;
}> = ({ id, position, velocity, onHit }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const currentPos = useRef(position.clone());

  useFrame((_, delta) => {
    currentPos.current.addScaledVector(velocity, 120 * delta);
    ref.current.position.copy(currentPos.current);
    if (currentPos.current.length() > 300) onHit(id);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#00ffff" />
    </mesh>
  );
};

// --- Main App ---

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
      const data = await generateMission();
      setMission(data);
    } catch {
      setMission({ title: "CORE OVERRIDE", description: "AI failed.", objective: "Survival.", difficulty: "Hard" });
    } finally {
      setScore(0);
      setHealth(100);
      setEnemies([]);
      setBullets([]);
      setGameState(GameState.PLAYING);
    }
  };

  const spawnEnemy = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * 50;
    const z = Math.sin(angle) * 50;
    setEnemies(prev => [...prev, { id: Math.random().toString(), position: [x, 2.5, z], health: 100 }]);
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const timer = setInterval(spawnEnemy, 1500);
      return () => clearInterval(timer);
    }
  }, [gameState, spawnEnemy]);

  // Optimized Collision Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const loop = setInterval(() => {
      setBullets(prevB => {
        const toRemoveB = new Set<string>();
        const toRemoveE = new Set<string>();
        prevB.forEach(b => {
          const bp = new THREE.Vector3(...b.position);
          enemies.forEach(e => {
            if (bp.distanceTo(new THREE.Vector3(...e.position)) < 2) {
              toRemoveB.add(b.id);
              toRemoveE.add(e.id);
            }
          });
        });
        if (toRemoveE.size > 0) {
          setEnemies(e => e.filter(item => !toRemoveE.has(item.id)));
          setScore(s => s + toRemoveE.size * 100);
        }
        return toRemoveB.size > 0 ? prevB.filter(item => !toRemoveB.has(item.id)) : prevB;
      });
    }, 50);
    return () => clearInterval(loop);
  }, [enemies, gameState]);

  return (
    <div className="w-full h-screen bg-black text-white select-none">
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg">
          <div className="text-center p-12 border border-cyan-500/20 bg-slate-900/40 rounded-3xl shadow-2xl">
            <h1 className="text-6xl font-black font-orbitron text-cyan-400 mb-4 tracking-tight">NEON STRIKE</h1>
            <p className="text-pink-500 uppercase tracking-[0.4em] text-xs font-bold mb-12">Gemini Tactical Arena</p>
            <button onClick={startNewGame} className="px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase rounded-lg transition-all flex items-center gap-3 mx-auto">
              <Play size={20} fill="currentColor" />
              Begin Link
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.LOADING && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
          <div className="text-cyan-400 uppercase tracking-widest text-xs animate-pulse">Syncing...</div>
        </div>
      )}

      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <h2 className="text-7xl font-black text-pink-500 mb-4 font-orbitron">FAILED</h2>
            <div className="text-3xl font-bold mb-12">SCORE: {score}</div>
            <button onClick={startNewGame} className="px-10 py-4 bg-pink-500 text-white font-black uppercase rounded-lg">Retry Link</button>
          </div>
        </div>
      )}

      {/* HUD */}
      {(gameState === GameState.PLAYING) && (
        <div className="absolute inset-0 pointer-events-none z-10 p-10 flex justify-between">
          <div className="flex gap-4 items-center">
            <Shield className="text-cyan-400" />
            <div>
              <div className="text-[10px] text-cyan-500 uppercase font-black">Integrity</div>
              <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${health}%` }} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-pink-500 uppercase font-black">Data Collected</div>
            <div className="text-4xl font-black text-white font-orbitron">{score}</div>
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
                onUpdatePosition={p => playerPosRef.current.copy(p)}
                onShoot={(p, d) => setBullets(b => [...b, { id: Math.random().toString(), position: [p.x, p.y, p.z], velocity: [d.x, d.y, d.z] }])}
              />
              {enemies.map(e => (
                <Enemy 
                  key={e.id} 
                  position={e.position} 
                  playerPosition={playerPosRef.current} 
                  onReachPlayer={() => {
                    setHealth(h => {
                      if (h <= 20) setGameState(GameState.GAMEOVER);
                      return Math.max(0, h - 20);
                    });
                    setEnemies(en => en.filter(item => item.id !== e.id));
                  }}
                />
              ))}
              {bullets.map(b => (
                <Bullet key={b.id} id={b.id} position={new THREE.Vector3(...b.position)} velocity={new THREE.Vector3(...b.velocity)} onHit={id => setBullets(prev => prev.filter(x => x.id !== id))} />
              ))}
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default App;
