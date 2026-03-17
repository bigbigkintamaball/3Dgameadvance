// --- ゲーム全体の状態 ---
let score = 0;
let isGameOver = false;

// --- 1. 基本環境の準備 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 画像の準備
const textureLoader = new THREE.TextureLoader();
const playerTex = textureLoader.load('player.png');
const swordTex = textureLoader.load('sword.png');
const mobTextures = [
    textureLoader.load('mob1.png'), textureLoader.load('mob2.png'), textureLoader.load('mob3.png')
];

// --- 2. クラス化（設計図） ---
class Player {
    constructor() {
        this.group = new THREE.Group();
        scene.add(this.group);

        this.body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ map: playerTex }));
        this.body.position.y = 1;
        this.group.add(this.body);

        const swordGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        swordGeo.translate(0, 0.75, 0);
        this.sword = new THREE.Mesh(swordGeo, new THREE.MeshStandardMaterial({ map: swordTex }));
        this.sword.position.set(0.6, 1, -0.2);
        this.group.add(this.sword);

        this.speed = 0.15;
        this.isAttacking = false;
        this.attackFrame = 0;
    }

    move(dx, dz) {
        this.group.position.x += dx;
        this.group.position.z += dz;
    }

    attack() {
        if (!this.isAttacking && !isGameOver) {
            this.isAttacking = true;
            this.attackFrame = 0;
        }
    }

    update() {
        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame <= 10) this.sword.rotation.x -= 0.15;
            else if (this.attackFrame <= 20) this.sword.rotation.x += 0.15;
            else {
                this.isAttacking = false;
                this.sword.rotation.x = 0;
            }
        }
    }
}

class EnemyManager {
    constructor() {
        this.activeEnemies = [];
        this.pool = [];
        this.geometry = new THREE.BoxGeometry(1, 2, 1);
        this.speed = 0.05;
    }

    spawn(targetPos) {
        if (isGameOver) return;
        let enemy;
        
        if (this.pool.length > 0) {
            enemy = this.pool.pop();
            enemy.visible = true;
        } else {
            const randomTex = mobTextures[Math.floor(Math.random() * mobTextures.length)];
            enemy = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ map: randomTex }));
            scene.add(enemy);
        }

        const angle = Math.random() * Math.PI * 2;
        enemy.position.set(targetPos.x + Math.cos(angle) * 15, 1, targetPos.z + Math.sin(angle) * 15);
        this.activeEnemies.push(enemy);
    }

    update(playerPos) {
        this.activeEnemies.forEach(e => {
            if (e.position.x < playerPos.x) e.position.x += this.speed;
            if (e.position.x > playerPos.x) e.position.x -= this.speed;
            if (e.position.z < playerPos.z) e.position.z += this.speed;
            if (e.position.z > playerPos.z) e.position.z -= this.speed;

            if (playerPos.distanceTo(e.position) < 1.0) {
                isGameOver = true;
                document.getElementById('gameOver').style.display = 'block';
            }
        });
    }

    remove(enemy) {
        enemy.visible = false; 
        this.activeEnemies = this.activeEnemies.filter(e => e !== enemy);
        this.pool.push(enemy);
    }
}

// --- 3. ゲーム開始と操作の設定 ---
const player = new Player();
const enemyManager = new EnemyManager();

setInterval(() => enemyManager.spawn(player.group.position), 2000);

// 【復活】PC用キーボードとマウスの準備
const keys = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
});
document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) player.attack();
});

// スマホ用ジョイスティックの準備
const joystick = { active: false, id: null, originX: 0, originY: 0, deltaX: 0, deltaY: 0 };
const maxJoyDistance = 40;
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2) {
            if (!joystick.active) {
                joystick.active = true; joystick.id = touch.identifier;
                joystick.originX = touch.clientX; joystick.originY = touch.clientY;
                joystick.deltaX = 0; joystick.deltaY = 0;
                joystickBase.style.display = 'block';
                joystickBase.style.left = touch.clientX + 'px'; joystickBase.style.top = touch.clientY + 'px';
                joystickStick.style.transform = `translate(-50%, -50%)`;
            }
        } else {
            player.attack();
        }
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystick.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystick.id) {
            let dx = touch.clientX - joystick.originX; let dy = touch.clientY - joystick.originY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > maxJoyDistance) { dx = (dx / distance) * maxJoyDistance; dy = (dy / distance) * maxJoyDistance; }
            joystick.deltaX = dx; joystick.deltaY = dy;
            joystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (joystick.active && e.changedTouches[i].identifier === joystick.id) {
            joystick.active = false; joystick.deltaX = 0; joystick.deltaY = 0;
            joystickBase.style.display = 'none';
        }
    }
}, { passive: false });

// --- 4. メインループ ---
function animate() {
    requestAnimationFrame(animate);
    if (isGameOver) {
        renderer.render(scene, camera);
        return;
    }

    // 【復活】プレイヤーの移動（スマホとPCの共存）
    if (joystick.active) {
        // スマホのジョイスティック移動
        player.move((joystick.deltaX / maxJoyDistance) * player.speed, (joystick.deltaY / maxJoyDistance) * player.speed);
    } else {
        // PCのWASDキー移動
        if (keys.w) player.move(0, -player.speed);
        if (keys.s) player.move(0, player.speed);
        if (keys.a) player.move(-player.speed, 0);
        if (keys.d) player.move(player.speed, 0);
    }
    
    player.update();

    // 攻撃の当たり判定
    if (player.attackFrame === 10) {
        for (let i = enemyManager.activeEnemies.length - 1; i >= 0; i--) {
            const e = enemyManager.activeEnemies[i];
            if (player.group.position.distanceTo(e.position) < 3.0) {
                enemyManager.remove(e);
                score++;
                document.getElementById('scoreText').innerText = score;
            }
        }
    }

    enemyManager.update(player.group.position);
    
    camera.position.x = player.group.position.x;
    camera.position.y = player.group.position.y + 4;
    camera.position.z = player.group.position.z + 8;
    camera.lookAt(player.group.position);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
