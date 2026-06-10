import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import LoadingScreen from "../Components/LoadingScreen/LoadingScreen";

function Scene(mount) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    8000,
  );

  camera.position.set(0, 120, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 30;
  controls.maxDistance = 800;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.enablePan = false;

  const minPan = new THREE.Vector3(-500, -500, -500);
  const maxPan = new THREE.Vector3(500, 500, 500);
  controls.addEventListener("change", () => {
    controls.target.clamp(minPan, maxPan);
    camera.position.clamp(minPan, maxPan);
  });

  controls.target.set(0, 0, 0);

  const sunLight = new THREE.PointLight(0xffffff, 10, 3000);
  const ambient = new THREE.AmbientLight(0xffffff, 2.2);
  scene.add(sunLight);
  scene.add(ambient);

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("resize", handleResize);

  const makeCanvas = (size, draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    draw(ctx, size);
    return canvas;
  };

  const canvasTex = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    makeCanvas,
    canvasTex,
    cleanup: () => window.removeEventListener("resize", handleResize),
  };
}

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

function OrbiterRings(scene) {
  const rings = [];

  const orbits = [
    { radius: 80,  color: 0x444466 },
    { radius: 130, color: 0x444466 },
    { radius: 190, color: 0x444466 },
    { radius: 260, color: 0x444466 },
    { radius: 340, color: 0x444466 },
    { radius: 430, color: 0x444466 },
    { radius: 530, color: 0x444466 },
    { radius: 640, color: 0x444466 },
  ];

  orbits.forEach(({ radius, color }) => {
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true });
    const ring = new THREE.LineLoop(geo, mat);

    scene.add(ring);
    rings.push({ ring, radius });
  });

  return { rings };
}

function SolarSystem() {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const sunRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const {
      scene,
      camera,
      renderer,
      controls,
      makeCanvas,
      canvasTex,
      cleanup,
    } = Scene(mount);
    const loader = new GLTFLoader();

    Stars(scene);
    OrbiterRings(scene)

    const sun = Sun(scene, loader, { makeCanvas, canvasTex }, () => {
      setTimeout(() => {
        setLoading(false);

        setTimeout(() => {
          setLoadingVisible(false);
        }, 1000);
      }, 1000);
    });

    sunRef.current = sun;

    const animate = () => {
      requestAnimationFrame(animate);

      const sunObj = sunRef.current?.get();
      if (sunObj) sunObj.rotation.y += 0.0005;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cleanup();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div ref={mountRef} />
      {loadingVisible && <LoadingScreen isVisible={loading} />}
    </div>
  );
}

export default SolarSystem;
