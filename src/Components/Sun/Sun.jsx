import * as THREE from "three";

function Sun(scene, loader, utils, onLoaded) {
  let sun = null;

  loader.load("models/sun.glb", (gltf) => {
    sun = gltf.scene;

    const box = new THREE.Box3().setFromObject(sun);
    const size = new THREE.Vector3();
    box.getSize(size);

    const scale = 32 / Math.max(size.x, size.y, size.z);
    sun.scale.setScalar(scale);

    const glowCanvas = utils.makeCanvas(256, (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,230,80,0.8)");
      g.addColorStop(0.25, "rgba(255,160,0,0.5)");
      g.addColorStop(0.6, "rgba(255,80,0,0.2)");
      g.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    });

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: utils.canvasTex(glowCanvas),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    glow.scale.set(130, 130, 1);
    sun.add(glow);
    scene.add(sun);

    onLoaded();
  });

  return { get: () => sun };
}

export default Sun;
