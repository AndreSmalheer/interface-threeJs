import * as THREE from "three";
import { gsap } from "gsap";

function Planet(scene, data, utils, loaders = {}) {
  const pivot = new THREE.Object3D();
  pivot.rotation.y = Math.random() * Math.PI * 2;
  scene.add(pivot);

  const map = loaders.texture.load(data.textureUrl);

  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.8,
    emissiveIntensity: 0.1,
  });

  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = data.distance;
  pivot.add(mesh);

  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * data.distance,
        0,
        Math.sin(angle) * data.distance,
      ),
    );
  }

  const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
  const ringMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 0.1,
    transparent: true,
  });

  const ring = new THREE.LineLoop(ringGeo, ringMat);
  scene.add(ring);

  const orbitDuration = (Math.PI * 2) / (data.speed * 60 * 4);
  const rotationDuration = (Math.PI * 2) / (data.rotationSpeed * 60 * 4);

  gsap.to(pivot.rotation, {
    y: "+=" + Math.PI * 2,
    duration: orbitDuration,
    ease: "none",
    repeat: -1,
  });

  gsap.to(mesh.rotation, {
    y: "+=" + Math.PI * 2,
    duration: rotationDuration,
    ease: "none",
    repeat: -1,
  });

  return {
    mesh,
    pivot,
    data,
  };
}

export default Planet;
