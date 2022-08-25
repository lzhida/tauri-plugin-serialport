use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

use command::{available_ports, cancel_read, close, open, read, write};
use state::SerialportState;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
mod command;
mod error;
mod state;
mod test;

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("serialport")
        .invoke_handler(tauri::generate_handler![
            available_ports,
            cancel_read,
            close,
            open,
            read,
            write,
        ])
        .setup(move |app_handle| {
            app_handle.manage(SerialportState {
                serialports: Arc::new(Mutex::new(HashMap::new())),
            });
            Ok(())
        })
        .build()
}
