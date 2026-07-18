import * as THREE from 'three';
import { type PlayerMovementPacket, Player, PlayerController } from "./player";
import { type MessageAction, type Room } from 'trystero';
import { joinRoom } from '@trystero-p2p/firebase'

// TODO: make this abstract if more maps are made
export class ChanMap {
	scene: THREE.Scene

	constructor() {
		this.scene = new THREE.Scene();
	}

	public load(manager: THREE.LoadingManager) {
		const cubeLoader = new THREE.CubeTextureLoader(manager).setPath('skybox/');
		cubeLoader.load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'], (skybox) => {
			this.scene.background = skybox

			const directionalLight = new THREE.DirectionalLight( 0xffffff, 1.2 );
			this.scene.add( directionalLight );

			const floorGeo = new THREE.PlaneGeometry(200, 200);
			const floorMat = new THREE.MeshBasicMaterial({ color: 0xa5b6c4, side: THREE.DoubleSide });

			const floor = new THREE.Mesh(floorGeo, floorMat);
			floor.rotation.x = Math.PI / 2;
			this.scene.add(floor);
		});
	}
}

interface QueueAction {
	peerId: string;
	packet: PlayerMovementPacket;
}

const roomConfig = {
	appId: 'https://chanco-place-default-rtdb.firebaseio.com/'
}

export class ChanRoom {
	map: ChanMap
	room: Room
	controller: PlayerController
	localPlayer: Player
	players: Record<string, Player> = {}

	chat: MessageAction<string>
	chngUser: MessageAction<string>
	chngAva: MessageAction<string>

	plrMove: MessageAction<PlayerMovementPacket>
	moveQueue: Array<QueueAction> = []

	constructor(roomId: string, map: ChanMap) {
		this.map = map
		this.room = joinRoom(roomConfig, roomId);
		
		this.chat = this.room.makeAction<string>('chat');
		this.chngUser = this.room.makeAction<string>('change_username');
		this.chngAva = this.room.makeAction<string>('change_avatar');

		this.plrMove = this.room.makeAction<PlayerMovementPacket>('move');

		this.chngUser.onMessage = (username, {peerId}) => {
			if (!(peerId in this.players)) {
				this.createPlayer(peerId);
			}

			this.players[peerId].username = username;
			// TODO: make sure this changes their nametag... when i make it
		}

		this.chngAva.onMessage = (avatar, {peerId}) => {
			if (!(peerId in this.players)) {
				this.createPlayer(peerId);
			}

			this.players[peerId].changeAvatar(avatar);
		}

		this.plrMove.onMessage = (packet, {peerId}) => {
			this.moveQueue.push({peerId, packet});
		}

		
		this.localPlayer = new Player();
		this.map.scene.add(this.localPlayer.obj);
		this.controller = new PlayerController(this.localPlayer);

		this.chngUser.send(this.localPlayer.username);
		this.chngAva.send(this.localPlayer.avatar);

		this.room.onPeerJoin = peerId => {
			this.createPlayer(peerId);

			this.chngUser.send(this.localPlayer.username, {target: peerId});
			this.chngAva.send(this.localPlayer.avatar, {target: peerId});
			this.plrMove.send(this.localPlayer.createMovePacket(), {target: peerId});
		}

		this.room.onPeerLeave = peerId => {
			this.players[peerId].destroyAvatar();
			this.map.scene.remove(this.players[peerId].obj);
			delete this.players[peerId];
		}
	}

	createPlayer(peerId: string) {
		if (peerId in this.players) {
			console.error(`${peerId} already has a player!`);
			return;
		}

		let plr = new Player();
		this.map.scene.add(plr.obj);
		this.players[peerId] = plr;
		// will automatically subscribe to all the messages, which should come in soon after... hopefully
	}

	public tick(delta: number) {
		const movePacket = this.controller.tick();

		if (movePacket != null) {
			this.plrMove.send(movePacket);
		}

		this.localPlayer.tick(delta);

		for (const action of this.moveQueue) {
			if (!(action.peerId in this.players)) {
				this.createPlayer(action.peerId);
			}

			this.players[action.peerId].movePacket(action.packet);
		}

		for (const player of Object.values(this.players)) {
			player.tick(delta);
		}
	}
}