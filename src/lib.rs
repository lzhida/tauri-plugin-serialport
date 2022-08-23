use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

use command::{available_ports, close, open, read, write};
use state::SerialportState;
use std::{collections::HashMap, sync::Mutex};
mod command;
mod state;

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("serialport")
        .invoke_handler(tauri::generate_handler![
            available_ports,
            open,
            close,
            write,
            read
        ])
        .setup(move |app_handle| {
            app_handle.manage(SerialportState {
                serialports: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .build()
}
