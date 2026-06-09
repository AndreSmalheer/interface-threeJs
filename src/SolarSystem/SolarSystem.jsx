import { useEffect, useRef } from "react";
import * as THREE from "three";

function SolarSystem() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 3, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    scene.add(new THREE.PointLight(0xffffff, 2));

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshStandardMaterial({
        emissive: 0xffff00,
        emissiveIntensity: 2,
      }),
    );
    scene.add(sun);

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e90ff }),
    );
    scene.add(planet);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      t += 0.01;

      planet.position.x = Math.cos(t) * 4;
      planet.position.z = Math.sin(t) * 4;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);

      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }

      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} />;
}

export default SolarSystem;
