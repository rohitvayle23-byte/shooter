
import React from 'react';
import { Grid, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';

export const Arena: React.FC = () => {
  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>

      <Grid
        infiniteGrid
        fadeDistance={50}
        sectionColor="#00ffff"
        sectionSize={5}
        sectionThickness={1.5}
        cellColor="#ff00ff"
        cellSize={1}
        cellThickness={0.5}
      />

      {/* Walls */}
      <mesh position={[0, 5, -50]}>
        <boxGeometry args={[100, 10, 1]} />
        <meshStandardMaterial color="#111" emissive="#00ffff" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 5, 50]}>
        <boxGeometry args={[100, 10, 1]} />
        <meshStandardMaterial color="#111" emissive="#00ffff" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-50, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[100, 10, 1]} />
        <meshStandardMaterial color="#111" emissive="#00ffff" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[50, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[100, 10, 1]} />
        <meshStandardMaterial color="#111" emissive="#00ffff" emissiveIntensity={0.2} />
      </mesh>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
      <pointLight position={[-10, 10, -10]} intensity={2} color="#ff00ff" />
    </>
  );
};
