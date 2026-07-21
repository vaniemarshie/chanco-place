<style>
	@import url('https://fonts.googleapis.com/css2?family=SN+Pro&display=swap');

	#container {
		width: 500px;
		height: 275px;
		gap: 6px;

		display: flex;
		flex-direction: column;
	}

	#log {
		width: 100%;
		flex-grow: 1;
		background-color: #14171c;
		color: #ffffff;

		font-size: 14px;

		font-family: "SN Pro", sans-serif;
		font-optical-sizing: auto;
		font-weight: 400;
		font-style: normal;

		padding: 8px;
		border-radius: 8px;
		box-sizing: border-box;

		display: flex;
		flex-direction: column-reverse;

		overflow-y: auto;
	}

	#log::-webkit-scrollbar {
		width: 8px;
		background-color: #00000000;
	}

	#log::-webkit-scrollbar-thumb {
		color: #14171c;
		border-radius: 4px;
	}

	:global(.log-msg) {
		overflow-wrap: break-word;
		scroll-snap-align: end
	}

	:global(.local-msg) {
		color: #525b69;
	}

	#chat-input {
		width: 100%;
		background-color: #14171c;
		color: #ffffff;

		font-size: 14px;

		font-family: "SN Pro", sans-serif;
		font-optical-sizing: auto;
		font-weight: 400;
		font-style: normal;
		
		padding: 8px;
		border-radius: 8px;
		border: 2px solid #2C7C5B;

		box-sizing: border-box;
	}

	#chat-input:focus {
		outline: none;
	}

	#chat-input::placeholder {
		font-style: italic;
		opacity: 1;
		color: #525b69;
	}

	#chat-input:focus::placeholder{
		color: transparent;
	}
</style>

<script lang="ts">
	let { onSend, onFocus } = $props()

	let log: HTMLDivElement;
	let input: HTMLInputElement;
	let shortcutActive: boolean = true;


	interface logMessage {
		text: string
		type: 'local' | 'global'
		time?: number
		playerName?: string
		playerColor?: string
	}

	export function sendLogMessage(msg: logMessage) {
		let msgDiv = document.createElement('div');

		msgDiv.classList.add('log-msg');
		if (msg.type == 'local') msgDiv.classList.add('local-msg');

		if (msg.time) {
			let date = new Date(msg.time);
			let hours24 = date.getHours()
			let hours = hours24.toString().padStart(2, '0');
			let meridiem = 'AM'

			if (hours24 > 12) {
				hours = (hours24 - 12).toString().padStart(2, '0');
				meridiem = 'PM'
			}
			
			let minutes = date.getMinutes().toString().padStart(2, '0');
			let time = document.createTextNode(`[${hours}:${minutes} ${meridiem}] `);
			msgDiv.append(time);
		}

		if (msg.playerName) {
			let nameElem = document.createElement('span');
			let nameText = document.createTextNode(`${msg.playerName}: `);
			nameElem.append(nameText);

			if (msg.playerColor) nameElem.style.color = msg.playerColor;
			msgDiv.append(nameElem);
		}

		let msgText = document.createTextNode(msg.text);
		msgDiv.append(msgText);

		log.prepend(msgDiv);
	}


	document.addEventListener('keydown', (e) => {
		if (e.key == 'Enter' && shortcutActive == true) {
			e.preventDefault();
			if (!(document.activeElement?.id == 'chat-input')) {
				input?.focus();
			}
		}
	});

	let send = (e: KeyboardEvent) => {
		if (e.key == 'Enter') {
			e.preventDefault();
			shortcutActive = false;
			setTimeout(() => {shortcutActive = true});
			input.blur();

			onSend(input.value);
			input.value = ''
		}
	}
</script>

<div id='container'>
	<div id='log' bind:this={log}></div>
	<input id='chat-input'
		type='text'
		placeholder="Click here or press Enter to chat..."
		autocomplete="off"
		bind:this={input}
		onkeydown={send}
		onfocus={() => onFocus(true)}
		onblur={() => onFocus(false)}
	>
</div>