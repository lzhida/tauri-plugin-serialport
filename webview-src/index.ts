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

export async function open(options: OpenOption) {
  return await invoke('plugin:serialport|open', {
    path: options.path,
    baudRate: options.baudRate,
  });
}

export async function close(path: string) {
  return await invoke('plugin:serialport|close', {
    path,
  });
}

export async function write(options: WriteOption) {
  return await invoke('plugin:serialport|write', {
    path: options.path,
    value: options.value,
  });
}

export async function read(options: ReadOptions) {
  return await invoke('plugin:serialport|read', {
    path: options.path,
    readEvent: options.readEvent || `${options.path}-read`,
  });
}

export async function listen<T>(
  event: string,
  handler: (...args: any[]) => void,
) {
  try {
    const listener = await appWindow.listen<T>(event, ({ event, payload }) => {
      handler(event, payload);
    });
    return Promise.resolve(listener);
  } catch (error) {
    Promise.reject(error);
  }
}
