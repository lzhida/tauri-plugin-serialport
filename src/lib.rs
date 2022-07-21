use serde::Serialize;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime, State, Window,
};

use serialport::{self, SerialPort};
use std::{collections::HashMap, sync::Mutex, time::Duration};

#[derive(Serialize, Clone)]
pub struct InvokeResult {
    code: i32,
    message: String,
}

#[derive(Default)]
pub struct SerialportHandler {
    // plugin state, configuration fields
    serialports: Mutex<HashMap<String, Box<dyn SerialPort>>>,
}

#[derive(Serialize, Clone)]
pub struct ReadData<'a> {
    data: &'a [u8],
    size: usize,
}

#[derive(Default)]
struct MyState(Mutex<HashMap<String, String>>);

#[tauri::command]
fn available_ports() -> Vec<String> {
    let mut list = match serialport::available_ports() {
        Ok(list) => list.clone(),
        Err(_) => vec![],
    };
    list.sort_by(|a, b| a.port_name.cmp(&b.port_name));
    println!("获取串口列表: {:?}", &list);

    let mut name_list: Vec<String> = vec![];
    for i in &list {
        println!("串口名称: {}", i.port_name);
        name_list.push(i.port_name.clone());
    }

    name_list
}

#[tauri::command]
fn open<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    collection: State<'_, SerialportHandler>,
    path: String,
    baud_rate: u32,
) -> Result<InvokeResult, InvokeResult> {
    if let Ok(mut serialports) = collection.serialports.lock() {
        if serialports.contains_key(&path) {
            return Err(InvokeResult {
                code: -3,
                message: format!("串口 {} 已打开!", path.clone()),
            });
        } else {
            match serialport::new(path.clone(), baud_rate)
                .timeout(Duration::from_millis(10))
                .open()
            {
                Ok(serial) => {
                    serialports.insert(path.clone(), serial);
                    Ok(InvokeResult {
                        code: 0,
                        message: format!("创建串口 {} 成功!", path.clone()),
                    })
                }
                Err(_) => Err(InvokeResult {
                    code: -1,
                    message: format!("创建串口 {} 失败!", path.clone()),
                }),
            }
        }
    } else {
        return Err(InvokeResult {
            code: -2,
            message: "获取锁失败".to_string(),
        });
    }
}

#[tauri::command]
fn close<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    collection: State<'_, SerialportHandler>,
    path: String,
) -> Result<InvokeResult, InvokeResult> {
    if let Ok(mut serialports) = collection.serialports.lock() {
        if let Some(_) = serialports.remove(&path) {
            return Ok(InvokeResult {
                code: 0,
                message: format!("关闭串口 {} 成功!", &path),
            });
        } else {
            return Err(InvokeResult {
                code: -4,
                message: format!("串口 {} 未打开!", &path),
            });
        }
    } else {
        return Err(InvokeResult {
            code: -2,
            message: "获取锁失败".to_string(),
        });
    }
}

#[tauri::command]
fn write<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    collection: State<'_, SerialportHandler>,
    path: String,
    value: String,
) -> Result<InvokeResult, InvokeResult> {
    if let Ok(mut serialports) = collection.serialports.lock() {
        if let Some(serialport) = serialports.get_mut(&path) {
            if let Ok(_) = serialport.write(value.as_bytes()) {
                return Ok(InvokeResult {
                    code: 0,
                    message: format!("写入串口 {} 数据: {} 成功!", &path, &value),
                });
            } else {
                return Err(InvokeResult {
                    code: -4,
                    message: format!("写入串口 {} 数据: {} 失败!", &path, &value),
                });
            };
        } else {
            return Err(InvokeResult {
                code: -4,
                message: format!("串口 {} 未打开!", &path),
            });
        }
    } else {
        return Err(InvokeResult {
            code: -2,
            message: "获取锁失败".to_string(),
        });
    }
}

#[tauri::command]
fn read<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    collection: State<'_, SerialportHandler>,
    path: String,
    read_event: String,
) -> Result<InvokeResult, InvokeResult> {
    if let Ok(mut serialports) = collection.serialports.lock() {
        if let Some(serialport) = serialports.get_mut(&path) {
            let mut serial_buf: Vec<u8> = vec![0; 1024];
            match serialport.read(serial_buf.as_mut_slice()) {
                Ok(size) => {
                    window
                        .emit(
                            &read_event,
                            ReadData {
                                data: &serial_buf[..size],
                                size,
                            },
                        )
                        .unwrap();
                    return Ok(InvokeResult {
                        code: 0,
                        message: format!("读取串口 {} 数据成功!", &path),
                    });
                }
                Err(_) => {
                    return Ok(InvokeResult {
                        code: 0,
                        message: format!("串口 {} 没有新数据!", &path),
                    });
                }
            }
        } else {
            return Err(InvokeResult {
                code: -4,
                message: format!("串口 {} 未打开!", &path),
            });
        }
    } else {
        return Err(InvokeResult {
            code: -2,
            message: "获取锁失败".to_string(),
        });
    }
}

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
            app_handle.manage(SerialportHandler {
                serialports: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .build()
}
