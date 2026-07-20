import * as THREE from 'three'
import { MMD, MMDLoader } from '@moeru/three-mmd'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GameInputs } from 'game-inputs'

const clamp = (val:number, min:number, max:number) => Math.min(Math.max(val, min), max);

interface avatar {
	name: string,
	credit: string,
	url: string,
	mmd?: MMD
}

const avatars: Record<string, avatar> = {
	miku: {name: 'Hatsune Miku', credit: 'Tawashi', url: 'models/CHANxCO_style_MIKU.pmx'},
	rin: {name: 'Kagamine Rin', credit: 'Tawashi', url: 'models/CHANxCO_style_RIN.pmx'},
	len: {name: 'Kagamine Len', credit: 'Tawashi', url: 'models/CHANxCO_style_LEN.pmx'},
	luka: {name: 'Megurine Luka', credit: 'Tawashi', url: 'models/CHANxCO_style_LUKA.pmx'},
	meiko: {name: 'MEIKO', credit: 'Tawashi', url: 'models/CHANxCO_style_MEIKO.pmx'},
	kaito: {name: 'KAITO', credit: 'Tawashi', url: 'models/CHANxCO_style_KAITO.pmx'},
	gumi: {name: 'Megpoid GUMI', credit: 'Tawashi', url: 'models/CHANxCO_style_GUMI.pmx'},
	gakupo: {name: 'Camui Gackpo', credit: 'Tawashi', url: 'models/CHANxCO_style_GAKUPO.pmx'},
	teto: {name: 'Kasane Teto', credit: 'Tawashi', url: 'models/CHANxCO_style_TETO.pmx'},
	neru: {name: 'Akita Neru', credit: 'Tawashi', url: 'models/CHANxCO_style_NERU.pmx'},
	yukari: {name: 'Yuzuki Yukari', credit: 'Tawashi', url: 'models/CHANxCO_style_YUKARI_P.pmx'},
	akari: {name: 'Kizuna Akari', credit: 'ちょむP', url: 'models/CHANxCO_style_AKARI.pmx'},
	ia: {name: 'IA', credit: 'Ise Terumi', url: 'models/CHANxCO_style_custom_IA.pmx'},
	one: {name: 'ONE', credit: 'Ise Terumi', url: 'models/CHANxCO_style_custom_ONE.pmx'},
	momo: {name: 'Momo Momone', credit: 'Tawashi', url: 'models/CHANxCO_style_MOMO.pmx'},
	haku: {name: 'Yowane Haku', credit: 'Tawashi', url: 'models/CHANxCO_style_HAKU.pmx'}
}

export function loadAvatars(manager: THREE.LoadingManager) {
	const mmdLoader = new MMDLoader([], manager);
	for (const avatar of Object.values(avatars)) {
		mmdLoader.load(avatar.url, (mmd) => {
			avatar.mmd = mmd;
		})
	}
}

export type PlayerMovementPacket = {
	position: MoveVector;
	velocity: MoveVector;
	time: number;
}

type MoveVector = {
	x: number, z: number
}

function mvToVector(vector: MoveVector): THREE.Vector3 {
	return new THREE.Vector3(vector.x, 0, vector.z)
}

const rotationSpeed = 12;

export class Player {
	username: string = '???';
	avatar: string = '';

	velocity: MoveVector = {x: 0, z: 0};
	finalRot: THREE.Quaternion = new THREE.Quaternion();
	obj: THREE.Object3D = new THREE.Object3D();
	avatarContainer: THREE.Object3D =  new THREE.Object3D();
	avatarMesh: THREE.SkinnedMesh | undefined;

	constructor() {
		this.obj.add(this.avatarContainer);

		this.changeAvatar('miku');
	}

	public movePacket(data: PlayerMovementPacket) {
		this.obj.position.set(data.position.x, 0, data.position.z);
		this.velocity = data.velocity;

		const timeSincePacket = (Date.now() - data.time) / 1000;
		this.obj.position.add(mvToVector(this.velocity).multiplyScalar(timeSincePacket));

		if (this.velocity.x != 0 || this.velocity.z != 0 ) {
			this.finalRot.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mvToVector(this.velocity).normalize());
		}
	}

	public createMovePacket(): PlayerMovementPacket {
		return {
			position: {
				x: this.obj.position.x,
				z: this.obj.position.z,
			},
			velocity: this.velocity,
			time: Date.now()
		}
	}

	public tick(delta: number) {
		this.obj.position.add(mvToVector(this.velocity).multiplyScalar(delta));

		this.avatarContainer.setRotationFromQuaternion(this.avatarContainer.quaternion.rotateTowards(this.finalRot, rotationSpeed * delta));
	}

	public changeAvatar(avatar: string) {
		if (!Object.hasOwn(avatars, avatar)) {
			console.error(`${this.username}'s avatar ${avatar} does not exist!`);
			return;
		}

		if (avatar == this.avatar) return;
		
		this.avatar = avatar;
		this.destroyAvatar();

		this.avatarMesh = SkeletonUtils.clone(avatars[avatar].mmd!.mesh) as THREE.SkinnedMesh;
		this.avatarContainer.add(this.avatarMesh);
	}

	public destroyAvatar() {
		if (this.avatarMesh) {
			this.avatarMesh.geometry.dispose();
			if (this.avatarMesh.material) {
                if (Array.isArray(this.avatarMesh.material)) {
                    this.avatarMesh.material.forEach(mat => mat.dispose());
                } else {
                    this.avatarMesh.material.dispose();
                }
            }
			this.avatarContainer.remove(this.avatarMesh);
		}
	}
}

const playerSpeed = 16;

export class PlayerController {
	localPlayer: Player
	cameraPivot: THREE.Object3D
	camera: THREE.PerspectiveCamera
	inputs: GameInputs

	constructor(localPlayer: Player) {
		this.localPlayer = localPlayer;
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

		this.cameraPivot = new THREE.Object3D();
		this.cameraPivot.rotation.order = 'ZYX'
		this.cameraPivot.position.y = 6
		localPlayer.obj.add(this.cameraPivot);
		this.cameraPivot.add(this.camera);

		this.camera.position.z = 25;
		this.camera.lookAt(this.cameraPivot.position);

		window.addEventListener('resize', () => {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		});


		let canvas = document.getElementById('gameplay-canvas') as HTMLCanvasElement;
		canvas.addEventListener("mousedown", async (e) => {
			if (e.button == 2) {
				await canvas.requestPointerLock();
			}
		});
		canvas.addEventListener("mouseup", (e) => {
			if (e.button == 2) {
				document.exitPointerLock();
			}
		});

		const moveCamera = (e: MouseEvent) => {
			this.cameraPivot.rotation.y = (this.cameraPivot.rotation.y - (e.movementX * 0.005)) % (Math.PI * 2);
			this.cameraPivot.rotation.x = clamp(this.cameraPivot.rotation.x - (e.movementY * 0.005), -1.5, 0);
		}

		const zoomCamera = (e: WheelEvent) => {
			this.camera.position.z += e.deltaY * 0.05;
			this.camera.position.z = clamp(this.camera.position.z, 10, 50);
		}

		function lockChangeAlert() {
			if (document.pointerLockElement === canvas) {
				document.addEventListener("mousemove", moveCamera);
				document.addEventListener("wheel", zoomCamera);
			} else {
				document.removeEventListener("mousemove", moveCamera);
				document.removeEventListener("wheel", zoomCamera);
			}
		}
		document.addEventListener("pointerlockchange", lockChangeAlert);


		this.inputs = new GameInputs(document.getElementById('gameplay-canvas') as HTMLElement, {
			preventDefaults: true,
			stopPropagation: true,
			allowContextMenu: false,
			disabled: false
		});

		// TODO: custom binds
		this.inputs.bind('fwd', 'KeyW');
		this.inputs.bind('back', 'KeyS');
		this.inputs.bind('left', 'KeyA');
		this.inputs.bind('right', 'KeyD');
	}

	public tick(): PlayerMovementPacket | null {
		let mVec = {
			x: (this.inputs.state['right'] ? playerSpeed:0) + (this.inputs.state['left'] ? -playerSpeed:0),
			z: (this.inputs.state['back'] ? playerSpeed:0) + (this.inputs.state['fwd'] ? -playerSpeed:0)
		}

		let rotatedMVec = mvToVector(mVec).applyEuler(new THREE.Euler(0, this.cameraPivot.rotation.y, 0, 'ZYX'));

		this.inputs.tick();

		if (this.localPlayer.velocity.x != rotatedMVec.x || this.localPlayer.velocity.z != rotatedMVec.z) {
			this.localPlayer.velocity = {
				x: rotatedMVec.x,
				z: rotatedMVec.z
			}

			if (this.localPlayer.velocity.x != 0 || this.localPlayer.velocity.z != 0 ) {
				this.localPlayer.finalRot.setFromUnitVectors(new THREE.Vector3(0, 0, 1), rotatedMVec.normalize());
			}
			return this.localPlayer.createMovePacket();
		}

		return null
	}
}