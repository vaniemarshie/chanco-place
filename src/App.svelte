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
	import { loadAvatars } from './player';
	import { ChanMap, ChanRoom } from './room';

	const map = new ChanMap();
	let isLoading = true;

	function load() {
		const manager = new THREE.LoadingManager();
		manager.onLoad = init;

		loadAvatars(manager);
		map.load(manager);
	}

	function init() {
		isLoading = false;

		const room = new ChanRoom('room-1', map);

		let canvas = document.getElementById('gameplay-canvas') as HTMLCanvasElement;
		const renderer = new THREE.WebGLRenderer({canvas: canvas});
		renderer.setSize(window.innerWidth, window.innerHeight);

		canvas.addEventListener('contextmenu', function(event) {
			event.preventDefault();
		});

		window.addEventListener('resize', () => {
			renderer.setSize(window.innerWidth, window.innerHeight)
		});

		// loop start!
		const timer = new THREE.Timer();
		renderer.setAnimationLoop((time) => {
			timer.update(time);
			const delta = timer.getDelta();
			// TODO: camera controls
			room.tick(delta);
			renderer.render(room.map.scene, room.controller.camera);
		});
	}

	load()
</script>

<div id='loading-text' class:done={!isLoading}>Loading Assets...</div>

<canvas id='gameplay-canvas'></canvas>