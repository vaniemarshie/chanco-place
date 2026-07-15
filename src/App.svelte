<style>
	@import url('https://fonts.googleapis.com/css2?family=SN+Pro&display=swap');

	:global(body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;

		background-color: #000000;

		font-family: "SN Pro", sans-serif;
		font-optical-sizing: auto;
		font-weight: 400;
		font-style: normal;
	}

	#loading-text {
		position: absolute;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		font-size: 32px;

		background-color: #14171c;
		color: #ffffff;

		opacity: 1;
		transition: opacity 1s;

		z-index: 2;

		display: flex;
		justify-content: center; /* Centers horizontally */
		align-items: center;     /* Centers vertically */
	}

	#loading-text.done {
		opacity: 0;
		pointer-events: none;
	}
</style>

<script lang="ts">
	import * as THREE from 'three'
	import { MMD, MMDLoader } from '@moeru/three-mmd'

	let isLoading = true;

	interface avatar {
		name: string,
		credit: string,
		url: string,
		mmd?: MMD
	}

	const avatars: Record<string, avatar> = {
		miku: {name: 'Hatsune Miku', credit: 'Tawashi', url: 'models/CHANxCO_style_MIKU.pmx'}
	}

	let skyboxTexture: null | THREE.CubeTexture = null

	function load() {
		const manager = new THREE.LoadingManager();
		manager.onLoad = init;

		const mmdLoader = new MMDLoader([], manager)
		const cubeLoader = new THREE.CubeTextureLoader(manager).setPath('skybox/')

		for (const avatar of Object.values(avatars)) {
			mmdLoader.load(avatar.url, (mmd) => {
				avatar.mmd = mmd
			})
		}

		skyboxTexture = cubeLoader.load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'])
	}

	function init() {
		isLoading = false;

		const scene = new THREE.Scene()
		scene.background = skyboxTexture
	
		const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

		const directionalLight = new THREE.DirectionalLight( 0xffffff, 1.2 );
		scene.add( directionalLight );

		const canvas = document.getElementById('gameplay-canvas') as HTMLCanvasElement
		const renderer = new THREE.WebGLRenderer({canvas: canvas})
		renderer.setSize(window.innerWidth, window.innerHeight)

		canvas.addEventListener('contextmenu', function(event) {
			event.preventDefault();
		});

		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight
			camera.updateProjectionMatrix()
			
			renderer.setSize(window.innerWidth, window.innerHeight)
		});

		let pivot = new THREE.Object3D()
		scene.add(pivot)
		pivot.add(camera)
		
		camera.position.z = 20
		camera.lookAt(pivot.position)

		let miku = new THREE.Object3D()
		scene.add(miku)

		// shut the fuck up typescript
		if (avatars.miku.mmd) {
			let model = avatars.miku.mmd.mesh
			model.position.y = -6
			miku.add(model);
		}
	
		renderer.setAnimationLoop((time) => {
			miku.rotation.x = time / 2000
			miku.rotation.y = time / 1000
			pivot.rotation.y = time / 10000

			renderer.render(scene, camera)
		});
	}

	load()
</script>

<div id='loading-text' class:done={!isLoading}>Loading Assets...</div>

<canvas id="gameplay-canvas"></canvas>
