import { UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

export interface InvokeResult {
  code: number;
  message: string;
}

export interface ReadDataResult {
  size: number;
  data: number[];
}

export interface SerialportOptions {
  path: string;
  baudRate: number;
  encoding?: string;
  dataBits?: 5 | 6 | 7 | 8;
  flowControl?: null | 'Software' | 'Hardware';
  parity?: null | 'Odd' | 'Even';
  stopBits?: 1 | 2;
  timeout?: number;
  size?: number;
  [key: string]: any;
}

interface Options {
  dataBits: 5 | 6 | 7 | 8;
  flowControl: null | 'Software' | 'Hardware';
  parity: null | 'Odd' | 'Even';
  stopBits: 1 | 2;
  timeout: number;
  [key: string]: any;
}

interface ReadOptions {
  timeout?: number;
  size?: number;
}

class Serialport {
  isOpen: boolean;
  unListen?: UnlistenFn;
  encoding: string;
  options: Options;
  size: number;

  constructor(options: SerialportOptions) {
    const {
      encoding = 'utf-8',
      path,
      baudRate,
      dataBits = 8,
      flowControl,
      parity,
      stopBits = 2,
      timeout = 200,
      size = 1024,
    } = options;
    this.isOpen = false;
    this.encoding = encoding;
    this.options = {
      path: path,
      baudRate: baudRate,
      dataBits: dataBits,
      flowControl: flowControl || null,
      parity: parity || null,
      stopBits: stopBits,
      timeout: timeout,
    };
    this.size = size;
  }

  /**
   * @description: 获取串口列表
   * @return {Promise<string[]>}
   */
  static async available_ports(): Promise<string[]> {
    try {
      return await invoke<string[]>('plugin:serialport|available_ports');
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 强制关闭
   * @param {string} path
   * @return {Promise<void>}
   */
  static async forceClose(path: string): Promise<void> {
    return await invoke<void>('plugin:serialport|force_close', {
      path,
    });
  }

  /**
   * @description: 关闭所有串口
   * @return {Promise<void>}
   */
  static async closeAll(): Promise<void> {
    return await invoke<void>('plugin:serialport|close_all');
  }

  /**
   * @description: 取消串口监听
   * @return {Promise<void>}
   */
  async cancelListen(): Promise<void> {
    try {
      if (this.unListen) {
        this.unListen();
        this.unListen = undefined;
      }
      return;
    } catch (error) {
      return Promise.reject('取消串口监听失败: ' + error);
    }
  }

  /**
   * @description: 取消读取数据
   * @return {Promise<void>}
   */
  async cancelRead(): Promise<void> {
    try {
      return await invoke<void>('plugin:serialport|cancel_read', {
        path: this.options.path,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description:
   * @param {object} options
   * @return {Promise<void>}
   */
  async change(options: { path?: string; baudRate?: number }): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      if (options.path) {
        this.options.path = options.path;
      }
      if (options.baudRate) {
        this.options.baudRate = options.baudRate;
      }
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 关闭串口
   * @return {Promise<InvokeResult>}
   */
  async close(): Promise<void> {
    try {
      if (!this.isOpen) {
        return;
      }
      await this.cancelRead();
      const res = await invoke<void>('plugin:serialport|close', {
        path: this.options.path,
      });

      await this.cancelListen();
      this.isOpen = false;
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 监听串口信息
   * @param {function} fn
   * @return {Promise<void>}
   */
  async listen(fn: (...args: any[]) => void, isDecode = true): Promise<void> {
    try {
      await this.cancelListen();
      let readEvent = 'plugin-serialport-read-' + this.options.path;
      this.unListen = await appWindow.listen<ReadDataResult>(
        readEvent,
        ({ payload }) => {
          try {
            if (isDecode) {
              const decoder = new TextDecoder(this.encoding);
              const data = decoder.decode(new Uint8Array(payload.data));
              fn(data);
            } else {
              fn(new Uint8Array(payload.data));
            }
          } catch (error) {
            console.error(error);
          }
        },
      );
      return;
    } catch (error) {
      return Promise.reject('监听串口数据失败: ' + error);
    }
  }

  /**
   * @description: 打开串口
   * @return {*}
   */
  async open(): Promise<void> {
    try {
      if (!this.options.path) {
        return Promise.reject(`path 不能为空!`);
      }
      if (!this.options.baudRate) {
        return Promise.reject(`baudRate 不能为空!`);
      }
      if (this.isOpen) {
        return;
      }
      const res = await invoke<void>('plugin:serialport|open', {
        path: this.options.path,
        baudRate: this.options.baudRate,
        dataBits: this.options.dataBits,
        flowControl: this.options.flowControl,
        parity: this.options.parity,
        stopBits: this.options.stopBits,
        timeout: this.options.timeout,
      });
      this.isOpen = true;
      return Promise.resolve(res);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 读取串口信息
   * @param {ReadOptions} options 读取选项 { timeout, size }
   * @return {Promise<void>}
   */
  async read(options?: ReadOptions): Promise<void> {
    try {
      return await invoke<void>('plugin:serialport|read', {
        path: this.options.path,
        timeout: options?.timeout || this.options.timeout,
        size: options?.size || this.size,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 设置串口 波特率
   * @param {number} value
   * @return {Promise<void>}
   */
  async setBaudRate(value: number): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      this.options.baudRate = value;
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 设置串口 path
   * @param {string} value
   * @return {Promise<void>}
   */
  async setPath(value: string): Promise<void> {
    try {
      let isOpened = false;
      if (this.isOpen) {
        isOpened = true;
        await this.close();
      }
      this.options.path = value;
      if (isOpened) {
        await this.open();
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 串口写入数据
   * @param {string} value
   * @return {Promise<number>}
   */
  async write(value: string): Promise<number> {
    try {
      if (!this.isOpen) {
        return Promise.reject(`串口 ${this.options.path} 未打开!`);
      }
      return await invoke<number>('plugin:serialport|write', {
        value,
        path: this.options.path,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description: 写入二进制数据到串口
   * @param {Uint8Array} value
   * @return {Promise<number>}
   */
  async writeBinary(value: Uint8Array | number[]): Promise<number> {
    try {
      if (!this.isOpen) {
        return Promise.reject(`串口 ${this.options.path} 未打开!`);
      }
      if (value instanceof Uint8Array || value instanceof Array) {
        return await invoke<number>('plugin:serialport|write_binary', {
          value: Array.from(value),
          path: this.options.path,
        });
      } else {
        return Promise.reject(
          'value 参数类型错误! 期望类型: string, Uint8Array, number[]',
        );
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

export { Serialport };
