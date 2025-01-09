use crate::error::Error;
use crate::state::{ReadData, SerialportInfo, SerialportState};
use serialport5::{DataBits, FlowControl, Parity, SerialPort, StopBits};
use std::io::{Read, Write};
use std::sync::mpsc;
use std::sync::mpsc::{Receiver, Sender, TryRecvError};
use std::thread;
use std::time::Duration;
use tauri::{command, AppHandle, Runtime, State, Window};

fn sanitize_event_name(input: &str) -> String {
    input
        .chars()
        .map(|c| match c {
            '.' => '_',                                                     // Replace '.' with '_'
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '/' | ':' | '_' => c, // Allow valid characters
            _ => '_', // Replace any other invalid character with '_'
        })
        .collect()
}

/// `get_serialport` 根据 `path` 获取串口实例。
fn get_serialport<T, F: FnOnce(&mut SerialportInfo) -> Result<T, Error>>(
    state: State<'_, SerialportState>,
    path: String,
    f: F,
) -> Result<T, Error> {
    match state.serialports.lock() {
        Ok(mut map) => match map.get_mut(&path) {
            Some(serialport_info) => f(serialport_info),
            None => Err(Error::String(format!("{} not found!", &path))),
        },
        Err(error) => Err(Error::String(format!("{} ", error))),
    }
}

/// `get_data_bits` 获取数据位
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

/// `get_flow_control` 获取数据流控制
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

/// `get_parity` 获取奇偶校验
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

/// `get_stop_bits` 获取停止位
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
    // TODO: 返回串口的详情
    let mut list = match serialport5::available_ports() {
        Ok(list) => list,
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
                    return Err(Error::String(format!("{}", error)));
                }
            },
            None => {}
        }
        serialport_info.sender = None;
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
            // TODO: 调用 close 方法关闭串口
            if serialports.remove(&path).is_some() {
                Ok(())
            } else {
                Err(Error::String(format!("串口 {} 未打开!", &path)))
            }
        }
        Err(error) => Err(Error::String(format!("获取锁失败: {}", error))),
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
                // 如果 sender 存在，则发送关闭信号
                if let Some(sender) = &serialport_info.sender {
                    match sender.send(1) {
                        Ok(_) => {}
                        Err(error) => {
                            return Err(Error::String(format!("{}", error)));
                        }
                    }
                }
            }
            map.clear();
            Ok(())
        }
        Err(error) => Err(Error::String(format!("{}", error))),
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
                            return Err(Error::String(format!("{}", error)));
                        }
                    }
                }
                map.remove(&path);
                Ok(())
            } else {
                Ok(())
            }
        }
        Err(error) => Err(Error::String(format!("{}", error))),
    }
}

/// `open` 打开指定串口
#[command]
pub fn open<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SerialportState>,
    _window: Window<R>,
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
                return Err(Error::String(format!("{} is opened!", &path)));
            }
            match SerialPort::builder()
                .baud_rate(baud_rate)
                .data_bits(get_data_bits(data_bits))
                .flow_control(get_flow_control(flow_control))
                .parity(get_parity(parity))
                .stop_bits(get_stop_bits(stop_bits))
                .read_timeout(Some(Duration::from_millis(timeout.unwrap_or(200))))
                .write_timeout(Some(Duration::from_millis(timeout.unwrap_or(200))))
                .open(&path)
            {
                Ok(serial) => {
                    let data = SerialportInfo {
                        serialport: serial,
                        sender: None,
                    };
                    serialports.insert(path, data);
                    Ok(())
                }
                Err(error) => Err(Error::String(format!(
                    "open {} error: {}",
                    path, error.description
                ))),
            }
        }
        Err(error) => Err(Error::String(format!("{}", error))),
    }
}

/// `read` 读取指定串口
#[command]
pub fn read<R: Runtime>(
    _app: AppHandle<R>,
    window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
    timeout: Option<u64>,
    size: Option<usize>,
) -> Result<(), Error> {
    get_serialport(state.clone(), path.clone(), |serialport_info| {
        if serialport_info.sender.is_some() {
            Ok(())
        } else {
            match serialport_info.serialport.try_clone() {
                Ok(mut serial) => {
                    let read_event =
                        format!("plugin-serialport-read-{}", sanitize_event_name(&path));
                    let (tx, rx): (Sender<usize>, Receiver<usize>) = mpsc::channel();
                    serialport_info.sender = Some(tx);
                    thread::spawn(move || loop {
                        // 如果收到关闭信号，则退出循环
                        match rx.try_recv() {
                            Ok(_) => {
                                break;
                            }
                            Err(error) => match error {
                                TryRecvError::Disconnected => {
                                    break;
                                }
                                TryRecvError::Empty => {}
                            },
                        }
                        let mut serial_buf: Vec<u8> = vec![0; size.unwrap_or(1024)];
                        match serial.read(serial_buf.as_mut_slice()) {
                            Ok(size) => {
                                match window.emit(
                                    &read_event,
                                    ReadData {
                                        data: &serial_buf[..size],
                                        size,
                                    },
                                ) {
                                    Ok(_) => {}
                                    Err(_error) => {
                                        // TODO: 通知窗口发送数据失败
                                    }
                                }
                            }
                            Err(_err) => {}
                        }
                        thread::sleep(Duration::from_millis(timeout.unwrap_or(200)));
                    });
                }
                Err(error) => {
                    return Err(Error::String(format!("read {} error: {}", &path, error)));
                }
            }
            Ok(())
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
        Ok(size) => Ok(size),
        Err(error) => Err(Error::String(format!("write {} error: {}", &path, error))),
    })
}

/// `write` 写入二进制内容到指定串口
#[command]
pub fn write_binary<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, SerialportState>,
    path: String,
    value: Vec<u8>,
) -> Result<usize, Error> {
    get_serialport(state, path.clone(), |serialport_info| match serialport_info
        .serialport
        .write(&value)
    {
        Ok(size) => Ok(size),
        Err(error) => Err(Error::String(format!("write {} error: {}", &path, error))),
    })
}
