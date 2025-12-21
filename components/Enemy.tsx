
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface EnemyProps {
  position: [number, number, number];
  id: string;
  onReachPlayer: () => void;
  playerPosition: THREE.Vector3;
}

export const Enemy: React.FC<EnemyProps> = ({ position, onReachPlayer, playerPosition }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const currentPos = useRef(new THREE.Vector3(...position));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Move toward player
    const direction = new THREE.Vector3().subVectors(playerPosition, currentPos.current);
    const distance = direction.length();
    
    if (distance < 2) {
      onReachPlayer();
      return;
    }

    direction.normalize();
    const speed = 5;
    currentPos.current.addScaledVector(direction, speed * delta);
    
    meshRef.current.position.copy(currentPos.current);
    meshRef.current.rotation.y += delta * 2;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[1.5, 0]} />
      <MeshWobbleMaterial color="#ff00ff" factor={0.6} speed={2} emissive="#ff00ff" emissiveIntensity={2} />
    </mesh>
  );
};
