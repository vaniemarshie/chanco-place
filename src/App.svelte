<style>
	@import url('https://fonts.googleapis.com/css2?family=SN+Pro&display=swap');

	:global(body) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;

		font-family: "SN Pro", sans-serif;
		font-optical-sizing: auto;
		font-weight: 400;
		font-style: normal;
	}
</style>

<script lang="ts">
	import * as THREE from 'three'
	import { MMD, MMDLoader } from '@moeru/three-mmd'

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
		const scene = new THREE.Scene()
		scene.background = skyboxTexture
	
		const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

		const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
		scene.add( directionalLight );

		const renderer = new THREE.WebGLRenderer()
		renderer.setSize(window.innerWidth, window.innerHeight)
		document.body.appendChild(renderer.domElement)

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