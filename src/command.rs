use crate::error::Error;
use crate::state::{InvokeResult, ReadData, SerialportInfo, SerialportState};
// use std::collections::HashMap;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{command, AppHandle, Runtime, State, Window};

/// `get_worksheet` 根据 `path` 和 `sheet_name` 获取文件 sheet 实例。
fn get_serialport<T, F: FnOnce(&mut SerialportInfo) -> Result<T, Error>>(
    state: State<'_, SerialportState>,
    path: String,
    f: F,
) -> Result<T, Error> {
    match state.serialports.lock() {
        Ok(mut map) => match map.get_mut(&path) {
            Some(serialport_info) => return f(serialport_info),
            None => {
                return Err(Error::String(format!("未找到串口")));
            }
        },
        Err(error) => return Err(Error::String(format!("获取文件锁失败! {} ", error))),
    }
}

/// `get_worksheet` 根据 `path` 和 `sheet_name` 获取文件 sheet 实例。
// fn try_get_serialport<T, F: FnOnce(&mut SerialportInfo) -> Result<T, Error>>(
//     state: Arc<std::sync::Mutex<HashMap<std::string::String, SerialportInfo>>>,
//     path: String,
//     f: F,
// ) -> Result<T, Error> {
//     match state.try_lock() {
//         Ok(mut map) => match map.get_mut(&path) {
//             Some(serialport_info) => return f(serialport_info),
//             None => {
//                 return Err(Error::String(format!("未找到串口")));
//             }
//         },
//         Err(error) => return Err(Error::String(format!("获取文件锁失败! {} ", error))),
//     }
// }

/// `available_ports` 获取串口列表
#[command]
pub fn available_ports() -> Vec<String> {
    let mut list = match serialport::available_ports() {
        Ok(list) => list.clone(),
        Err(_) => vec![],
    };
    list.sort_by(|a, b| a.port_name.cmp(&b.port_name));

    let mut name_list: Vec<String> = vec![];
    for i in &list {
        name_list.push(i.port_name.clone());
    }

    println!("串口列表: {:?}", &name_list);

    name_list
}

#[command]
pub async fn cancel_read<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
) -> Result<(), Error> {
    get_serialport(state, path, |serialport_info| {
        serialport_info.is_reading = false;
        println!("取消串口读取");
        Ok(())
    })
}

/// `close` 关闭指定串口
#[command]
pub fn close<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    collection: State<'_, SerialportState>,
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

/// `open` 打开指定串口
#[command]
pub fn open<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
    baud_rate: u32,
) -> Result<InvokeResult, Error> {
    if let Ok(mut serialports) = state.serialports.lock() {
        if serialports.contains_key(&path) {
            return Err(Error::InvokeResult {
                code: -3,
                message: format!("串口 {} 已打开!", path.clone()),
            });
        }
        match serialport::new(path.clone(), baud_rate)
            .timeout(Duration::from_millis(200))
            .open()
        {
            Ok(serial) => {
                let data = SerialportInfo {
                    serialport: serial,
                    is_reading: false,
                };
                serialports.insert(path.clone(), data);
                Ok(InvokeResult {
                    code: 0,
                    message: format!("创建串口 {} 成功!", path.clone()),
                })
            }
            Err(_) => Err(Error::InvokeResult {
                code: -1,
                message: format!("创建串口 {} 失败!", path.clone()),
            }),
        }
    } else {
        return Err(Error::InvokeResult {
            code: -2,
            message: "获取锁失败".to_string(),
        });
    }
}

/// `read` 读取指定串口
#[command]
pub fn read<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
) -> Result<(), Error> {
    get_serialport(state.clone(), path.clone(), |serialport_info| {
        if serialport_info.is_reading {
            println!("串口已经在读取数据中!");
            return Ok(());
        } else {
            serialport_info.is_reading = true;
            let state = Arc::clone(&state.serialports);
            thread::spawn(move || loop {
                match state.try_lock() {
                    Ok(mut map) => {
                        let read_event = format!("plugin-serialport-read-{}", &path);
                        println!("获取锁成功! {}, {}", path, read_event);
                        match map.get_mut(&path) {
                            Some(serial) => {
                                println!("获取串口信息成功! {}", serial.is_reading);
                                if !serial.is_reading {
                                    println!("停止读取数据");
                                    break;
                                }
                                let mut serial_buf: Vec<u8> = vec![0; 1024];
                                // println!("开始读取数据: {:?}", &serial_buf);
                                match serial.serialport.read(serial_buf.as_mut_slice()) {
                                    Ok(size) => {
                                        println!("读取数据: {}, {:?}", size, &serial_buf);
                                        window
                                            .emit(
                                                &read_event,
                                                ReadData {
                                                    data: &serial_buf[..size],
                                                    size,
                                                },
                                            )
                                            .expect("发送失败!");
                                    }
                                    Err(err) => {
                                        println!("读取数据失败! {:?}", err);
                                    }
                                }
                            }
                            None => {
                                println!("获取串口失败!");
                            }
                        }
                    }
                    Err(_) => {
                        println!("获取锁失败!");
                    }
                };
                thread::sleep(Duration::from_secs(1));
            });
            return Ok(());
        }
    })
}

/// `write` 写入指定串口
#[command]
pub fn write<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
    value: String,
) -> Result<InvokeResult, Error> {
    get_serialport(state, path.clone(), |serialport_info| {
        if let Ok(_) = serialport_info.serialport.write(value.as_bytes()) {
            return Ok(InvokeResult {
                code: 0,
                message: format!("写入串口 {} 数据: {} 成功!", &path, &value),
            });
        } else {
            return Err(Error::InvokeResult {
                code: -4,
                message: format!("写入串口 {} 数据: {} 失败!", &path, &value),
            });
        };
    })
}
