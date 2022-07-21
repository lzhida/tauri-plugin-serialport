
# Tauri Plugin serialport

基于 `serialport` 库开发的tauri插件。

## 安装

### RUST

`src-tauri/Cargo.toml`

```toml
[dependencies.tauri-plugin-serialport]
git = "https://github.com/lzhida/tauri-plugin-serialport"
tag = "v0.1.0"
```

Use in `src-tauri/src/main.rs`:

```RUST
use tauri_plugin_serialport;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_serialport::init())
        .build()
        .run();
}
```

### WEBVIEW

`Install from a tagged release`

```
npm install github:lzhida/tauri-plugin-serialport#v0.1.0
# or
yarn add github:lzhida/tauri-plugin-serialport#v0.1.0
```

`Install from a branch (dev)`

```
npm install https://github.com/lzhida/tauri-plugin-serialport\#master
# or
yarn add https://github.com/lzhida/tauri-plugin-serialport\#master
```

`package.json`

```json
  "dependencies": {
    "tauri-plugin-serialport-api": "github:lzhida/tauri-plugin-serialport#v0.1.0",
  }
```

Use within your JS/TS:

```JS
import { open } from 'tauri-plugin-serialport-api';
```
