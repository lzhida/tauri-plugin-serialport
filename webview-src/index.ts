import { Event } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

export interface OpenOption {
  path: string;
  baudRate: number;
}

export interface WriteOption {
  path: string;
  value: string;
}

export interface ReadOptions {
  path: string;
  readEvent?: string;
}

export interface ReadDataResult {
  size: number,
  data: number[],
}

export async function open(options: OpenOption) {
  return invoke('plugin:serialport|open', {
    path: options.path,
    baudRate: options.baudRate,
  });
}

export async function close(path: string) {
  return invoke('plugin:serialport|close', {
    path,
  });
}

export async function write(options: WriteOption) {
  return invoke('plugin:serialport|write', {
    path: options.path,
    value: options.value,
  });
}

export async function read(options: ReadOptions) {
  return invoke('plugin:serialport|read', {
    path: options.path,
    readEvent: options.readEvent || `${options.path}-read`,
  });
}

export async function listen(
  event: string,
  handler: (event: Event<ReadDataResult>) => void,
) {
  try {
    const listener = await appWindow.listen<ReadDataResult>(event, (event) => {
      handler(event);
    });
    return Promise.resolve(listener);
  } catch (error) {
    Promise.reject(error);
  }
}

export async function available_ports() {
  return invoke('plugin:serialport|available_ports')
}