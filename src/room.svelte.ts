import * as THREE from 'three';
import { type PlayerMovementPacket, avatars, Player, PlayerController } from "./player";
import { selfId, type MessageAction, type Room } from 'trystero';
import { joinRoom } from '@trystero-p2p/firebase'
import ChatWindow from './ChatWindow.svelte';

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

interface Command {
	arguments: number;
	func: Function;
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

	chat: ChatWindow
	commands: Record<string, Command> = {}

	onChat: MessageAction<string>
	chngName: MessageAction<string>
	chngAva: MessageAction<string>

	plrMove: MessageAction<PlayerMovementPacket>
	moveQueue: Array<QueueAction> = []

	constructor(roomId: string, map: ChanMap, chat: ChatWindow) {
		this.map = map
		this.room = joinRoom(roomConfig, roomId);
		this.chat = chat
		
		this.onChat = this.room.makeAction<string>('chat');
		this.chngName = this.room.makeAction<string>('change_username');
		this.chngAva = this.room.makeAction<string>('change_avatar');

		this.plrMove = this.room.makeAction<PlayerMovementPacket>('move');

		this.onChat.onMessage = (msg, {peerId}) => {
			// TODO: player colors once i get them
			this.chat.sendLogMessage({
				text: msg,
				type: 'global',
				time: Date.now(),
				playerName: this.players[peerId].username
			});

			// TODO: also chat bubbles once i make them
		}

		this.chngName.onMessage = (username, {peerId}) => {
			if (!Object.hasOwn(this.players, peerId)) {
				this.createPlayer(peerId);
			}

			// TODO: make sure this changes their nametag... when i make it
			this.chat.sendLogMessage({
				text: `${this.players[peerId].username} has changed their name to ${username}.`,
				type: 'global',
				time: Date.now()
			});
			this.players[peerId].username = username;
		}

		this.chngAva.onMessage = (avatar, {peerId}) => {
			if (!Object.hasOwn(this.players, peerId)) {
				this.createPlayer(peerId);
			}

			this.players[peerId].changeAvatar(avatar);
			this.chat.sendLogMessage({
				text: `${this.players[peerId].username} has changed their avatar to ${avatars[avatar].name}.`,
				type: 'global',
				time: Date.now()
			});
		}

		this.plrMove.onMessage = (packet, {peerId}) => {
			this.moveQueue.push({peerId, packet});
		}

		
		this.localPlayer = new Player();
		// TODO: check if user has a predefined username
		this.localPlayer.username = localStorage.getItem('name') || selfId;
		this.map.scene.add(this.localPlayer.obj);
		this.controller = new PlayerController(this.localPlayer);

		if (localStorage.getItem('avatar')) {
			this.localPlayer.changeAvatar(localStorage.getItem('avatar') as string);
		}

		this.chngName.send(this.localPlayer.username);
		this.chngAva.send(this.localPlayer.avatar);

		this.room.onPeerJoin = peerId => {
			this.createPlayer(peerId);

			if (this.localPlayer.username != selfId) this.chngName.send(this.localPlayer.username, {target: peerId});
			if (this.localPlayer.avatar != 'miku') this.chngAva.send(this.localPlayer.avatar, {target: peerId});
			this.plrMove.send(this.localPlayer.createMovePacket(), {target: peerId});
		}

		this.room.onPeerLeave = (peerId: string) => {
			if (!Object.hasOwn(this.players, peerId)) {
				console.error(`${peerId} already doesn't exist!`);
				return;
			}
			
			this.players[peerId].destroyAvatar();
			this.map.scene.remove(this.players[peerId].obj);
			delete this.players[peerId];
		};


		this.commands.name = {
			arguments: 1,
			func: (name: string) => {
				this.chat.sendLogMessage({
					text: `${this.localPlayer.username} has changed their name to ${name}.`,
					type: 'global',
					time: Date.now()
				});
				this.localPlayer.username = name
				this.chngName.send(name);

				localStorage.setItem('name', name);
			}
		}

		this.commands.avatars = {
			arguments: 0,
			func: () => {
				this.chat.sendLogMessage({
					text: '-- Available Avatars --',
					type: 'local'
				});
				for(const avatarName of Object.keys(avatars)) {
					this.chat.sendLogMessage({
						text: `${avatarName}: ${avatars[avatarName].name} created by ${avatars[avatarName].credit}`,
						type: 'local'
					});
				}
			}
		}

		this.commands.avatar = {
			arguments: 1,
			func: (aviName: string) => {
				if (!Object.hasOwn(avatars, aviName)) {
					this.chat.sendLogMessage({
						text: `The avatar "${aviName}" does not exist!`,
						type: 'local'
					});
					return;
				}

				this.localPlayer.changeAvatar(aviName);
				this.chngAva.send(this.localPlayer.avatar);
				this.chat.sendLogMessage({
					text: `${this.localPlayer.username} has changed their avatar to ${avatars[aviName].name}.`,
					type: 'global',
					time: Date.now()
				});

				localStorage.setItem('avatar', aviName);
			}
		}
	}

	createPlayer(peerId: string) {
		if (Object.hasOwn(this.players, peerId)) {
			console.error(`${peerId} already has a player!`);
			return;
		}

		let plr = new Player();
		plr.username = peerId;
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
		this.moveQueue = [];

		for (const player of Object.values(this.players)) {
			player.tick(delta);
		}
	}

	public msgSend(msg: string) {
		if (msg.startsWith('/')) {
			this.parseCommand(msg);
			return;
		}

		this.chat.sendLogMessage({
			text: msg,
			type: 'global',
			time: Date.now(),
			playerName: this.localPlayer.username
		});

		this.onChat.send(msg);
	}

	parseCommand(msg: string) {
		this.chat.sendLogMessage({
			text: msg,
			type: 'local',
			time: Date.now(),
			playerName: this.localPlayer.username
		});

		let commandName = msg.slice(1).split(' ')[0];

		if (!Object.hasOwn(this.commands, commandName)) {
			this.chat.sendLogMessage({
				text: `The command "${commandName}" does not exist!`,
				type: 'local'
			});
			return;
		}

		let args = msg.split(' ').slice(1);
		if (args.length != this.commands[commandName].arguments) {
			this.chat.sendLogMessage({
				text: `Invalid arguments for "${commandName}"`,
				type: 'local'
			});
			return;
		}

		this.commands[commandName].func(...args);
	}
}