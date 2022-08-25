use crate::error::Error;
use crate::state::{ReadData, SerialportInfo, SerialportState};
// use std::collections::HashMap;
use serialport::{DataBits, FlowControl, Parity, StopBits};
use std::sync::mpsc::{Receiver, Sender, TryRecvError};
use std::sync::{mpsc, Arc};
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
//                 return Err(Error::String(format!("未找到 {} 串口", &path)));
//             }
//         },
//         Err(error) => return Err(Error::String(format!("获取文件锁失败! {} ", error))),
//     }
// }

fn get_data_bits(value: Option<usize>) -> DataBits {
    match value {
        Some(value) => match value {
            5 => DataBits::Five,
            6 => DataBits::Six,
            7 => DataBits::Seven,
            8 => DataBits::Eight,
            _ => DataBits::Eight,
        },
        None => DataBits::Eight,
    }
}

fn get_flow_control(value: Option<String>) -> FlowControl {
    match value {
        Some(value) => match value.as_str() {
            "Software" => FlowControl::Software,
            "Hardware" => FlowControl::Hardware,
            _ => FlowControl::None,
        },
        None => FlowControl::None,
    }
}

fn get_parity(value: Option<String>) -> Parity {
    match value {
        Some(value) => match value.as_str() {
            "Odd" => Parity::Odd,
            "Even" => Parity::Even,
            _ => Parity::None,
        },
        None => Parity::None,
    }
}

fn get_stop_bits(value: Option<usize>) -> StopBits {
    match value {
        Some(value) => match value {
            1 => StopBits::One,
            2 => StopBits::Two,
            _ => StopBits::Two,
        },
        None => StopBits::Two,
    }
}

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

/// `cacel_read` 取消串口数据读取
#[command]
pub async fn cancel_read<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
) -> Result<(), Error> {
    get_serialport(state, path.clone(), |serialport_info| {
        match &serialport_info.sender {
            Some(sender) => match sender.send(1) {
                Ok(_) => {}
                Err(error) => {
                    return Err(Error::String(format!("取消串口数据读取失败: {}", error)));
                }
            },
            None => {}
        }
        serialport_info.sender = None;
        println!("取消 {} 串口读取", &path);
        Ok(())
    })
}

/// `close` 关闭指定串口
#[command]
pub fn close<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
) -> Result<(), Error> {
    match state.serialports.lock() {
        Ok(mut serialports) => {
            if let Some(_) = serialports.remove(&path) {
                return Ok(());
            } else {
                return Err(Error::String(format!("串口 {} 未打开!", &path)));
            }
        }
        Err(error) => {
            return Err(Error::String(format!("获取锁失败: {}", error)));
        }
    }
}

/// `close_all` 关闭所有串口
#[command]
pub fn close_all<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
) -> Result<(), Error> {
    match state.serialports.lock() {
        Ok(mut map) => {
            for serialport_info in map.values() {
                if let Some(sender) = &serialport_info.sender {
                    match sender.send(1) {
                        Ok(_) => {}
                        Err(error) => {
                            println!("取消串口数据读取失败: {}", error);
                            return Err(Error::String(format!("取消串口数据读取失败: {}", error)));
                        }
                    }
                }
            }
            map.clear();
            Ok(())
        }
        Err(error) => {
            return Err(Error::String(format!("获取锁失败: {}", error)));
        }
    }
}

/// `force_close` 强制关闭串口
#[command]
pub fn force_close<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
) -> Result<(), Error> {
    match state.serialports.lock() {
        Ok(mut map) => {
            if let Some(serial) = map.get_mut(&path) {
                if let Some(sender) = &serial.sender {
                    match sender.send(1) {
                        Ok(_) => {}
                        Err(error) => {
                            println!("取消串口数据读取失败: {}", error);
                            return Err(Error::String(format!("取消串口数据读取失败: {}", error)));
                        }
                    }
                }
                map.remove(&path);
                return Ok(());
            } else {
                return Ok(());
            };
        }
        Err(error) => {
            return Err(Error::String(format!("获取锁失败: {}", error)));
        }
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
    data_bits: Option<usize>,
    flow_control: Option<String>,
    parity: Option<String>,
    stop_bits: Option<usize>,
    timeout: Option<u64>,
) -> Result<(), Error> {
    match state.serialports.lock() {
        Ok(mut serialports) => {
            if serialports.contains_key(&path) {
                return Err(Error::String(format!("串口 {} 已打开!", path.clone())));
            }
            match serialport::new(path.clone(), baud_rate)
                .data_bits(get_data_bits(data_bits))
                .flow_control(get_flow_control(flow_control))
                .parity(get_parity(parity))
                .stop_bits(get_stop_bits(stop_bits))
                .timeout(Duration::from_millis(timeout.unwrap_or(200)))
                .open()
            {
                Ok(serial) => {
                    let data = SerialportInfo {
                        serialport: serial,
                        sender: None,
                    };
                    serialports.insert(path.clone(), data);
                    return Ok(());
                }
                Err(error) => Err(Error::String(format!(
                    "创建串口 {} 失败: {}",
                    path.clone(),
                    error.description
                ))),
            }
        }
        Err(error) => {
            return Err(Error::String(format!("获取锁失败: {}", error)));
        }
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
        if serialport_info.sender.is_some() {
            println!("串口已经在读取数据中!");
            return Ok(());
        } else {
            let state = Arc::clone(&state.serialports);
            let read_event = format!("plugin-serialport-read-{}", &path);
            let (tx, rx): (Sender<usize>, Receiver<usize>) = mpsc::channel();
            serialport_info.sender = Some(tx);
            thread::spawn(move || loop {
                match rx.try_recv() {
                    Ok(_) => {
                        println!("停止读取数据!");
                        break;
                    }
                    Err(error) => match error {
                        TryRecvError::Disconnected => {
                            println!("停止读取数据!");
                            break;
                        }
                        TryRecvError::Empty => {}
                    },
                }
                match state.try_lock() {
                    Ok(mut map) => {
                        println!("获取锁成功! {}, {}", path, read_event);
                        match map.get_mut(&path) {
                            Some(serial) => {
                                println!("获取串口信息成功!");
                                let mut serial_buf: Vec<u8> = vec![0; 1024];
                                // println!("开始读取数据: {:?}", &serial_buf);
                                match serial.serialport.read(serial_buf.as_mut_slice()) {
                                    Ok(size) => {
                                        println!("读取数据: {}, {:?}", size, &serial_buf[..size]);
                                        match window.emit(
                                            &read_event,
                                            ReadData {
                                                data: &serial_buf[..size],
                                                size,
                                            },
                                        ) {
                                            Ok(_) => {}
                                            Err(error) => {
                                                println!("发送数据失败: {}", error)
                                            }
                                        }
                                    }
                                    Err(_err) => {
                                        // println!("读取数据失败! {:?}", err);
                                    }
                                }
                            }
                            None => {
                                println!("获取串口失败!");
                            }
                        }
                    }
                    Err(error) => {
                        println!("获取锁失败: {}", error);
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
) -> Result<usize, Error> {
    get_serialport(state, path.clone(), |serialport_info| match serialport_info
        .serialport
        .write(value.as_bytes())
    {
        Ok(size) => {
            return Ok(size);
        }
        Err(error) => {
            return Err(Error::String(format!(
                "写入串口 {} 数据失败: {}",
                &path, error
            )));
        }
    })
}
