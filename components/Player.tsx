
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Vector3 } from '@react-three/drei';
import * as THREE from 'three';

interface PlayerProps {
  onShoot: (position: THREE.Vector3, direction: THREE.Vector3) => void;
}

export const Player: React.FC<PlayerProps> = ({ onShoot }) => {
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
    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z = Number(moveForward) - Number(moveBackward);
    direction.current.x = Number(moveRight) - Number(moveLeft);
    direction.current.normalize();

    if (moveForward || moveBackward) velocity.current.z -= direction.current.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.current.x -= direction.current.x * 400.0 * delta;

    const moveVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    
    // Get camera's forward vector projected onto XZ plane
    camera.getWorldDirection(moveVector);
    moveVector.y = 0;
    moveVector.normalize();
    
    // Get camera's right vector
    rightVector.crossVectors(moveVector, camera.up);

    camera.position.addScaledVector(moveVector, -velocity.current.z * delta * 0.1);
    camera.position.addScaledVector(rightVector, velocity.current.x * delta * 0.1);

    // Keep within bounds
    camera.position.x = Math.max(-45, Math.min(45, camera.position.x));
    camera.position.z = Math.max(-45, Math.min(45, camera.position.z));
    camera.position.y = 2.5; // Fixed head height
  });

  return (
    <>
      <PointerLockControls />
      <mesh position={[0, -1.5, -2]} rotation={[0, 0, 0]}>
        {/* Simple Gun Visual Attached to Camera via Grouping if we were using nested components, 
            but for simplicity we use HUD and screen effects */}
      </mesh>
    </>
  );
};
