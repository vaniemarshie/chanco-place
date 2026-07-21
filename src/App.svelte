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

	#chat {
		position: absolute;
		bottom: 16px;
		left: 16px;
	}
</style>

<script lang="ts">
	import * as THREE from 'three'
	import { loadAvatars } from './player';
	import { ChanMap, ChanRoom } from './room.svelte';
	import ChatWindow from './ChatWindow.svelte';

	const map = new ChanMap();
	let isLoading = true;

	let chat: ChatWindow;
	let onChatSend: Function | null = null;
	let onChatFocus: Function | null = null;

	function load() {
		const manager = new THREE.LoadingManager();
		manager.onLoad = init;

		loadAvatars(manager);
		map.load(manager);
	}

	function init() {
		isLoading = false;

		const room = new ChanRoom('room-1', map, chat);

		let canvas = document.getElementById('gameplay-canvas') as HTMLCanvasElement;
		const renderer = new THREE.WebGLRenderer({canvas: canvas});
		renderer.setSize(window.innerWidth, window.innerHeight);

		canvas.addEventListener('contextmenu', function(event) {
			event.preventDefault();
		});

		window.addEventListener('resize', () => {
			renderer.setSize(window.innerWidth, window.innerHeight)
		});

		onChatFocus = (disabled: boolean) => {
			room.controller.inputsDisabled = disabled;
		}

		onChatSend = (msg: string) => {
			room.msgSend(msg);
		}

		function sendLocalMessage(message: string) {
			chat.sendLogMessage({
				text: message,
				type: 'local'
			})
		}

		sendLocalMessage('-- Welcome to CHANxCO Place! --');
		sendLocalMessage('This place is a tech demo for a p2p based mmo/glorified chat room.');
		sendLocalMessage('We are not associated with CHANxCO or any of the wonderful model creators.');
		sendLocalMessage('-- Getting Started --');
		sendLocalMessage('"/name [name]" to set your username for others to see!');
		sendLocalMessage('"/avatars" to look at the avatars you can equip.');
		sendLocalMessage('and "/avatar [name]" will set your avatar!');
 
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
<div id="chat">
	<ChatWindow onSend={onChatSend} onFocus={onChatFocus} bind:this={chat}/>
</div>