import * as THREE from "three";

function Stars(scene) {
  const starPos = [];

  for (let i = 0; i < 7000; i++) {
    const r = THREE.MathUtils.randFloat(800, 3500);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    starPos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));

  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1 }),
  );

  scene.add(stars);
  return stars;
}

export default Stars
