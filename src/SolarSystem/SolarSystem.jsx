import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import LoadingScreen from "../Components/LoadingScreen/LoadingScreen";
import InfoPanel from "../Components/InfoPanel/InfoPanel";

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

function createCameraAnimator(camera, controls) {
  const state = {
    active: false,
    animateTarget: true,
    targetPos: new THREE.Vector3(),
    targetLook: new THREE.Vector3(),
    speed: 0.045,
    onComplete: null,
  };

  const currentPos = new THREE.Vector3();
  const currentLook = new THREE.Vector3();

  function tick() {
    if (!state.active) return;

    currentPos.copy(camera.position);
    currentPos.lerp(state.targetPos, state.speed);
    camera.position.copy(currentPos);

    if (state.animateTarget) {
      currentLook.copy(controls.target);
      currentLook.lerp(state.targetLook, state.speed);
      controls.target.copy(currentLook);
    }

    const posClose = camera.position.distanceTo(state.targetPos) < 1.5;
    const lookClose =
      !state.animateTarget ||
      controls.target.distanceTo(state.targetLook) < 1.5;

    if (posClose && lookClose) {
      camera.position.copy(state.targetPos);
      if (state.animateTarget) controls.target.copy(state.targetLook);
      state.active = false;
      if (state.onComplete) state.onComplete();
    }
  }

  function moveTo(
    pos,
    look,
    speed = 0.045,
    animateTarget = true,
    onComplete = null,
  ) {
    state.targetPos.copy(pos);
    state.targetLook.copy(look);
    state.speed = speed;
    state.animateTarget = animateTarget;
    state.active = true;
    state.onComplete = onComplete;
  }

  function stop() {
    if (state.active) {
      state.active = false;
      if (state.onComplete) state.onComplete();
    }
  }

  return { tick, moveTo, stop, state };
}

const SOLAR_SYSTEM_DATA = {
  sun: {
    name: "The Sun",
    facts: [
      { label: "Type", value: "G-type main-sequence star" },
      { label: "Age", value: "~4.6 billion years" },
      { label: "Diameter", value: "1,392,700 km" },
      { label: "Surface temp", value: "5,778 K" },
      { label: "Distance from Earth", value: "149.6 million km" },
    ],
    description:
      "The Sun is the star at the centre of our solar system. Its gravity holds everything together — from the eight planets to distant comets. It accounts for 99.86% of the solar system's total mass.",
  },

  planets: [
    {
      name: "Mercury",
      radius: 9, // was 4
      distance: 80,
      speed: 0.00082,
      rotationSpeed: 0.0005,
      textureUrl: "/textures/mercury.jpg",
      info: {
        name: "Mercury",
        facts: [
          { label: "Type", value: "Terrestrial planet" },
          { label: "Orbit period", value: "88 days" },
          { label: "Surface temp", value: "100 to 700 K" },
        ],
        description:
          "Mercury is the smallest planet in the Solar System and the closest to the Sun.",
      },
    },
    {
      name: "Venus",
      radius: 14, // was 7
      distance: 130,
      speed: 0.00032,
      rotationSpeed: 0.0005,
      textureUrl: "/textures/venus.jpg",
      info: {
        name: "Venus",
        facts: [
          { label: "Type", value: "Terrestrial planet" },
          { label: "Orbit period", value: "225 days" },
          { label: "Surface temp", value: "737 K" },
        ],
        description:
          "Venus is the second planet from the Sun. It is the hottest planet in our solar system.",
      },
    },
    {
      name: "Earth",
      radius: 15, // was 7.5
      distance: 190,
      speed: 0.0002,
      rotationSpeed: 0.0008,
      textureUrl: "/textures/earth.jpg",
      info: {
        name: "Earth",
        facts: [
          { label: "Type", value: "Terrestrial planet" },
          { label: "Orbit period", value: "365.25 days" },
          { label: "Population", value: "8+ billion" },
        ],
        description:
          "Earth is our home planet and the only place we know of so far that’s inhabited by living things.",
      },
    },
    {
      name: "Mars",
      radius: 10, // was 5
      distance: 260,
      speed: 0.00011,
      rotationSpeed: 0.0005,
      textureUrl: "/textures/mars.jpg",
      info: {
        name: "Mars",
        facts: [
          { label: "Type", value: "Terrestrial planet" },
          { label: "Orbit period", value: "1.88 years" },
          { label: "Moons", value: "2" },
        ],
        description:
          "Mars is a dusty, cold, desert world with a very thin atmosphere.",
      },
    },
  ],
};

function Planet(scene, data, utils, loaders = {}) {
  const pivot = new THREE.Object3D();
  pivot.rotation.y = Math.random() * Math.PI * 2;
  scene.add(pivot);

  let material;
  const map = loaders.texture.load(data.textureUrl);
  material = new THREE.MeshStandardMaterial({
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

  return {
    mesh,
    pivot,
    data,
  };
}

function SolarSystem() {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [currentInfo, setCurrentInfo] = useState(SOLAR_SYSTEM_DATA.sun);
  const sunRef = useRef(null);
  const planetsRef = useRef([]);
  const animatorRef = useRef(null);
  const defaultCamPos = useRef(new THREE.Vector3(0, 120, 300));
  const defaultTarget = useRef(new THREE.Vector3(0, 0, 0));
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const isFocusedRef = useRef(false);
  const focusedPlanetRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const {
      scene,
      camera,
      renderer,
      controls,
      composer,
      makeCanvas,
      canvasTex,
      cleanup,
    } = Scene(mount);

    controlsRef.current = controls;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    Stars(scene);

    const sun = Sun(scene, loader, { makeCanvas, canvasTex }, () => {
      setTimeout(() => {
        setLoading(false);
        setTimeout(() => {
          setLoadingVisible(false);
        }, 1000);
      }, 1000);
    });

    sunRef.current = sun;

    const planets = SOLAR_SYSTEM_DATA.planets.map((data) =>
      Planet(
        scene,
        data,
        { makeCanvas, canvasTex },
        { texture: textureLoader },
      ),
    );
    planetsRef.current = planets;

    const animator = createCameraAnimator(camera, controls);
    animatorRef.current = animator;

    const sunHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(16, 32, 32),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    );
    scene.add(sunHitbox);

    const interactableObjects = [
      { mesh: sunHitbox, info: SOLAR_SYSTEM_DATA.sun, isSun: true },
      ...planets.map((p) => ({
        mesh: p.mesh,
        info: p.data.info,
        isSun: false,
        planet: p,
      })),
    ];

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const mouseStart = new THREE.Vector2();

    const handleMouseMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        interactableObjects.map((o) => o.mesh),
      );

      renderer.domElement.style.cursor =
        hits.length > 0 && !isFocusedRef.current ? "pointer" : "default";
    };

    const handleMouseDown = (e) => {
      mouseStart.set(e.clientX, e.clientY);
      if (isFocusedRef.current) {
        animator.stop();
      }
    };

    const resetFocus = () => {
      isFocusedRef.current = false;
      focusedPlanetRef.current = null;
      setFocused(false);
      controls.enabled = false;
      animator.moveTo(
        defaultCamPos.current,
        defaultTarget.current,
        0.035,
        true,
        () => {
          controls.enabled = true;
        },
      );
    };

    const handleClick = (e) => {
      const mouseEnd = new THREE.Vector2(e.clientX, e.clientY);
      if (mouseStart.distanceTo(mouseEnd) > 6) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        interactableObjects.map((o) => o.mesh),
      );

      if (hits.length > 0) {
        const hit = hits[0];
        const obj = interactableObjects.find((o) => o.mesh === hit.object);

        const isSunClicked = obj.isSun;
        const currentTargetIsSun =
          isFocusedRef.current && focusedPlanetRef.current === null;
        const currentTargetIsPlanet =
          isFocusedRef.current && focusedPlanetRef.current !== null;

        const isNewFocus =
          !isFocusedRef.current ||
          (isSunClicked && currentTargetIsPlanet) ||
          (!isSunClicked &&
            (currentTargetIsSun || focusedPlanetRef.current !== obj.planet));

        if (isNewFocus) {
          if (!isFocusedRef.current) {
            defaultCamPos.current.copy(camera.position);
            defaultTarget.current.copy(controls.target);
          }

          setCurrentInfo(obj.info);

          let focusPos, focusLook;
          const worldPos = new THREE.Vector3();

          if (obj.isSun) {
            focusedPlanetRef.current = null;
            focusPos = new THREE.Vector3(0, 40, 80);
            focusLook = new THREE.Vector3(0, 0, 0);
          } else {
            focusedPlanetRef.current = obj.planet;
            obj.mesh.getWorldPosition(worldPos);
            focusLook = worldPos.clone();
            const offset = new THREE.Vector3(0, 15, 30);
            focusPos = worldPos.clone().add(offset);
          }

          isFocusedRef.current = true;
          setFocused(true);

          controls.target.copy(focusLook);
          controls.enabled = true;

          animator.moveTo(focusPos, focusLook, 0.05, false);
        } else {
          resetFocus();
        }
      } else if (isFocusedRef.current) {
        resetFocus();
      }

      renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);

      const sunObj = sunRef.current?.get();
      if (sunObj) sunObj.rotation.y += 0.0005;

      planetsRef.current.forEach((p) => {
        p.pivot.rotation.y += p.data.speed;
        p.mesh.rotation.y += p.data.rotationSpeed;
        p.mesh.updateWorldMatrix(true, false);
      });

      if (focusedPlanetRef.current && isFocusedRef.current) {
        const p = focusedPlanetRef.current;
        const worldPos = new THREE.Vector3();
        p.mesh.getWorldPosition(worldPos);

        if (animator.state.active) {
          animator.state.targetLook.copy(worldPos);
          const offset = new THREE.Vector3(0, 15, 30);
          animator.state.targetPos.copy(worldPos).add(offset);

          if (!animator.state.animateTarget) {
            controls.target.copy(worldPos);
          }
        } else {
          const delta = worldPos.clone().sub(controls.target);
          controls.target.copy(worldPos);
          camera.position.add(delta);
        }
      }

      animator.tick();
      controls.update();
      composer.render();
    };

    animate();

    return () => {
      cleanup();
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const handleClose = () => {
    if (!isFocusedRef.current) return;
    isFocusedRef.current = false;
    setFocused(false);
    const controls = controlsRef.current;
    const animator = animatorRef.current;
    if (!controls || !animator) return;
    controls.enabled = false;
    animator.moveTo(defaultCamPos.current, defaultTarget.current, 0.035, () => {
      controls.enabled = true;
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        cursor: focused ? "default" : "pointer",
      }}
    >
      <div ref={mountRef} />
      {loadingVisible && <LoadingScreen isVisible={loading} />}
      {focused && <InfoPanel info={currentInfo} onClose={handleClose} />}
    </div>
  );
}

export default SolarSystem;
