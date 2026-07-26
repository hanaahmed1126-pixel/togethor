let socket = io();
let scene, camera, renderer;
let localPlayer, remotePlayers = {};

function initEngine() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 100, 50);
  sun.castShadow = true;
  scene.add(sun);

  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a233a, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  requestAnimationFrame(animate);
}

function createPlayerMesh(color = 0x00d2ff) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 2, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(bodyGeo, bodyMat);
  mesh.position.y = 1;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function createRoom() {
  const username = document.getElementById('username').value || 'Player';
  socket.emit('createRoom', { username });
}

function joinRoom() {
  const code = document.getElementById('room-input').value;
  const username = document.getElementById('username').value || 'Player';
  if (code) socket.emit('joinRoom', { roomCode: code, username });
}

socket.on('roomCreated', () => {
  document.getElementById('lobby-card').style.display = 'none';
  initEngine();
  localPlayer = createPlayerMesh(0x00d2ff);
  scene.add(localPlayer);
});

socket.on('roomJoined', () => {
  document.getElementById('lobby-card').style.display = 'none';
  initEngine();
  localPlayer = createPlayerMesh(0xff006e);
  scene.add(localPlayer);
});

socket.on('playerJoined', (playerData) => {
  const remoteMesh = createPlayerMesh(playerData.role === 'p1' ? 0x00d2ff : 0xff006e);
  scene.add(remoteMesh);
  remotePlayers[playerData.id] = remoteMesh;
});

socket.on('playerMoved', (data) => {
  if (remotePlayers[data.id]) {
    remotePlayers[data.id].position.set(data.x, data.y, data.z);
    remotePlayers[data.id].rotation.y = data.rotY;
  }
});

socket.on('playerLeft', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id]);
    delete remotePlayers[id];
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (renderer && scene && camera) renderer.render(scene, camera);
}
