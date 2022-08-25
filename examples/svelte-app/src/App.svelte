<script lang="ts">
  import { Serialport } from 'tauri-plugin-serialport-api';

  let serialport: Serialport | undefined = undefined;

  function openSerialport() {
    serialport = new Serialport({ path: 'COM4', baudRate: 115200 });
    serialport
      .open()
      .then((res) => {
        console.log('open serialport', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function available_ports() {
    Serialport.available_ports()
      .then((res) => {
        console.log('available_ports: ', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function close() {
    serialport
      .close()
      .then((res) => {
        console.log('close serialport', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function write() {
    serialport
      .write('TEST')
      .then((res) => {
        console.log('write serialport: ', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function read() {
    serialport
      .read()
      .then((res) => {
        console.log('read serialport: ', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function listen() {
    serialport
      .listen((data: any[]) => {
        console.log('listen serialport data: ', data);
      })
      .then((res) => {
        console.log('listen serialport: ', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  function cancelRead() {
    serialport
      .cancelRead()
      .then((res) => {
        console.log('cancel read: ', res);
      })
      .catch((err) => {
        console.error(err);
      });
  }
</script>

<div>
  <button on:click={available_ports}>Available Ports</button>
  <button on:click={openSerialport}>Open</button>
  <button on:click={close}>Close</button>
  <button on:click={write}>Write</button>
  <button on:click={read}>Read</button>
  <button on:click={listen}>listen</button>
  <button on:click={cancelRead}>cancelRead</button>
</div>
