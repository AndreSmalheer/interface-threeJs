import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

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

  const sunLight = new THREE.PointLight(0xffffff, 8, 3000);
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4);
  scene.add(sunLight);
  scene.add(ambient);
  scene.add(hemi);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.45,
    0.4,
    0.25,
  );
  composer.addPass(bloomPass);

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
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
    composer,
    makeCanvas,
    canvasTex,
    cleanup: () => window.removeEventListener("resize", handleResize),
  };
}

export default Scene;
