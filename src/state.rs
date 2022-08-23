use serde::Serialize;
use serialport::{self, SerialPort};
use std::{collections::HashMap, sync::Mutex};

#[derive(Default)]
pub struct SerialportState {
    // plugin state, configuration fields
    pub serialports: Mutex<HashMap<String, Box<dyn SerialPort>>>,
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
