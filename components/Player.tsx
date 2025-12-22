
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

interface PlayerProps {
  onShoot: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  onUpdatePosition: (position: THREE.Vector3) => void;
}

export const Player: React.FC<PlayerProps> = ({ onShoot, onUpdatePosition }) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': setMoveForward(true); break;
        case 'ArrowLeft':
        case 'KeyA': setMoveLeft(true); break;
        case 'ArrowDown':
        case 'KeyS': setMoveBackward(true); break;
        case 'ArrowRight':
        case 'KeyD': setMoveRight(true); break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': setMoveForward(false); break;
        case 'ArrowLeft':
        case 'KeyA': setMoveLeft(false); break;
        case 'ArrowDown':
        case 'KeyS': setMoveBackward(false); break;
        case 'ArrowRight':
        case 'KeyD': setMoveRight(false); break;
      }
    };

    const onMouseDown = () => {
      // Only shoot if the game is focused and pointer is locked
      if (!document.pointerLockElement) return;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      onShoot(camera.position.clone(), dir);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [camera, onShoot]);

  useFrame((state, delta) => {
    // Clamp delta to prevent massive jumps on lag
    const dt = Math.min(delta, 0.1);

    velocity.current.x -= velocity.current.x * 10.0 * dt;
    velocity.current.z -= velocity.current.z * 10.0 * dt;

    direction.current.z = Number(moveForward) - Number(moveBackward);
    direction.current.x = Number(moveRight) - Number(moveLeft);
    direction.current.normalize();

    if (moveForward || moveBackward) velocity.current.z -= direction.current.z * 400.0 * dt;
    if (moveLeft || moveRight) velocity.current.x -= direction.current.x * 400.0 * dt;

    const moveVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    
    camera.getWorldDirection(moveVector);
    moveVector.y = 0;
    moveVector.normalize();
    
    rightVector.crossVectors(moveVector, camera.up);

    camera.position.addScaledVector(moveVector, -velocity.current.z * dt * 0.1);
    camera.position.addScaledVector(rightVector, velocity.current.x * dt * 0.1);

    camera.position.x = Math.max(-45, Math.min(45, camera.position.x));
    camera.position.z = Math.max(-45, Math.min(45, camera.position.z));
    camera.position.y = 2.5;

    onUpdatePosition(camera.position);
  });

  return (
    <>
      <PointerLockControls />
      <mesh position={[0.5, -0.4, -1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.15, 0.25, 0.6]} />
        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.1} />
        <mesh position={[0, 0.05, -0.3]}>
           <boxGeometry args={[0.05, 0.05, 0.1]} />
           <meshBasicMaterial color="#00ffff" />
        </mesh>
      </mesh>
    </>
  );
};
