use serde::Serialize;
use serialport5::{self, SerialPort};
use std::{
    collections::HashMap,
    sync::{mpsc::Sender, Arc, Mutex},
};

#[derive(Default)]
pub struct SerialportState {
    // plugin state, configuration fields
    pub serialports: Arc<Mutex<HashMap<String, SerialportInfo>>>,
}
pub struct SerialportInfo {
    pub serialport: SerialPort,
    pub sender: Option<Sender<usize>>,
}

#[derive(Serialize, Clone)]
pub struct InvokeResult {
    pub code: i32,
    pub message: String,
}

#[derive(Serialize, Clone)]
pub struct ReadData<'a> {
    pub data: &'a [u8],
    pub size: usize,
}
