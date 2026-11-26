// Draws models/brain.glb (a mesh of my brain from my MRI) in a rotatable 3D view.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const box = document.getElementById("brain-view");
const status = document.getElementById("brain-status");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
// start looking at the left side of the brain, a little from above and in front
camera.position.set(-330, 90, -120);

scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a1410, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(-1, 1.2, -0.6);
camera.add(key); // light moves with the camera, so the side you look at is lit
scene.add(camera);
const rim = new THREE.DirectionalLight(0xc9a24a, 0.9); // gold rim, the site's accent colour
rim.position.set(1, 0.3, 1);
camera.add(rim);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
// stop the slow spin once someone grabs it
controls.addEventListener("start", () => { controls.autoRotate = false; });

new GLTFLoader().load(
  "models/brain.glb",
  (gltf) => {
    const material = new THREE.MeshStandardMaterial({ color: 0xe6c2b4, roughness: 0.6, metalness: 0.0 });
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry.computeVertexNormals();
        o.material = material;
      }
    });
    scene.add(gltf.scene);
    status.remove();
  },
  (e) => {
    if (e.total) status.textContent = "Loading my brain… " + Math.round((e.loaded / e.total) * 100) + "%";
  },
  () => { status.textContent = "The 3D model could not load."; }
);

// back the camera off far enough that the whole brain (about 90 mm from its centre
// to its furthest point) fits in the view, whether the view is wide or tall
const RADIUS = 90;
function fitDistance() {
  const v = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hz = Math.atan(Math.tan(v) * camera.aspect);
  return (RADIUS / Math.sin(Math.min(v, hz))) * 1.05;
}

function resize() {
  const w = box.clientWidth, h = box.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const d = fitDistance();
  camera.position.setLength(d);
  controls.maxDistance = d * 2;
  controls.minDistance = Math.min(140, d * 0.6);
}
new ResizeObserver(resize).observe(box);
resize();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
