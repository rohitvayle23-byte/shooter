
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BulletProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  onHit: (bulletId: string) => void;
  id: string;
}

export const Bullet: React.FC<BulletProps> = ({ position, direction, onHit, id }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const currentPos = useRef(position.clone());
  const speed = 100;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    currentPos.current.addScaledVector(direction, speed * delta);
    meshRef.current.position.copy(currentPos.current);

    // Check bounds or distance
    if (currentPos.current.length() > 200) {
      onHit(id);
    }
  });

  return (
    <mesh ref={meshRef} position={position.toArray() as [number, number, number]}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#00ffff" />
    </mesh>
  );
};
