<script lang="ts">
	import SerialportHandler from './services/SerialportHandler';

	let serialport = null

	function openSerialport() {
		serialport = new SerialportHandler({ path: "COM6", baudRate: 15200})
		serialport.open().then((res) => {
			console.log('open serialport', res);
		}).catch(err => {
			console.error(err);
		})
	}

	function available_ports() {
		SerialportHandler.available_ports().then(res => {
			console.log('available_ports: ', res);
		}).catch(err => {
			console.error(err);
		})
	}

	function close() {
		serialport.close().then((res) => {
			console.log('close serialport', res);
		}).catch(err => {
			console.error(err);
		})
	}

	function write() {
		serialport.write("TEST").then(res => {
			console.log('write serialport: ', res);
		}).catch(err => {
			console.error(err);
		})
	}

	function read() {
		serialport.read().then(res => {
			console.log('read serialport: ', res);
		}).catch(err => {
			console.error(err);
		})
	}

	function listen() {
		serialport.listen((data: any[]) => {
			console.log('listen serialport data: ', data);
		}).then(res => {
			console.log('listen serialport: ', res);
		}).catch(err => {
			console.error(err);
		})
	}

</script>

<div>
	<button on:click="{available_ports}">Available Ports</button>
	<button on:click="{openSerialport}">Open</button>
	<button on:click="{close}">Close</button>
	<button on:click="{write}">Write</button>
	<button on:click="{read}">Read</button>
	<button on:click="{listen}">listen</button>
</div>
