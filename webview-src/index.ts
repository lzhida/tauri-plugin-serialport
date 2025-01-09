import { UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";

export interface ReadDataResult {
  size: number;
  data: number[];
}

export interface SerialportOptions {
  path: string;
  baudRate: number;
  encoding?: string;
  dataBits?: 5 | 6 | 7 | 8;
  flowControl?: null | "Software" | "Hardware";
  parity?: null | "Odd" | "Even";
  stopBits?: 1 | 2;
  timeout?: number;
  size?: number;
  [key: string]: any;
}

interface Options {
  dataBits: 5 | 6 | 7 | 8;
  flowControl: null | "Software" | "Hardware";
  parity: null | "Odd" | "Even";
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
      encoding = "utf-8",
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
   * @return
   */
  static async available_ports() {
    return await invoke<string[]>("plugin:serialport|available_ports");
  }

  /**
   * @description: 强制关闭
   * @param {string} path
   * @return
   */
  static async forceClose(path: string) {
    return await invoke<void>("plugin:serialport|force_close", {
      path,
    });
  }

  /**
   * @description: 关闭所有串口
   * @return
   */
  static async closeAll() {
    return await invoke<void>("plugin:serialport|close_all");
  }

  /**
   * @description: 取消串口监听
   * @return
   */
  async cancelListen() {
    if (this.unListen) {
      this.unListen();
      this.unListen = undefined;
    }
  }

  /**
   * @description: 取消读取数据
   * @return
   */
  async cancelRead() {
    return await invoke<void>("plugin:serialport|cancel_read", {
      path: this.options.path,
    });
  }

  /**
   * @description:
   * @param {object} options
   * @return
   */
  async change(options: { path?: string; baudRate?: number }) {
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
  }

  /**
   * @description: 关闭串口
   * @return
   */
  async close() {
    if (!this.isOpen) {
      throw new Error(`${this.options.path} is not opened!`);
    }
    await this.cancelRead();
    const res = await invoke<void>("plugin:serialport|close", {
      path: this.options.path,
    });

    await this.cancelListen();
    this.isOpen = false;
    return res;
  }

  /**
   * @description: 监听串口信息
   * @param {function} fn
   * @return
   */
  async listen(fn: (...args: any[]) => void, isDecode = true) {
    await this.cancelListen();
    let readEvent =
      "plugin-serialport-read-" + this.sanitizeEventName(this.options.path);
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
      }
    );
  }

  /**
   * @description: 打开串口
   * @return
   */
  async open() {
    if (!this.options.path) {
      throw new Error(`path is required!`);
    }
    if (!this.options.baudRate) {
      throw new Error(`baudRate is required!`);
    }
    if (this.isOpen) {
      throw new Error(`${this.options.path} is already opened!`);
    }
    const res = await invoke<void>("plugin:serialport|open", {
      path: this.options.path,
      baudRate: this.options.baudRate,
      dataBits: this.options.dataBits,
      flowControl: this.options.flowControl,
      parity: this.options.parity,
      stopBits: this.options.stopBits,
      timeout: this.options.timeout,
    });
    this.isOpen = true;
    return res;
  }

  /**
   * @description: 读取串口信息
   * @param {ReadOptions} options 读取选项 { timeout, size }
   * @return
   */
  async read(options?: ReadOptions) {
    return await invoke<void>("plugin:serialport|read", {
      path: this.options.path,
      timeout: options?.timeout || this.options.timeout,
      size: options?.size || this.size,
    });
  }

  /**
   * @description: 设置串口 波特率
   * @param {number} value
   * @return
   */
  async setBaudRate(value: number) {
    let isOpened = false;
    if (this.isOpen) {
      isOpened = true;
      await this.close();
    }
    this.options.baudRate = value;
    if (isOpened) {
      await this.open();
    }
  }

  /**
   * @description: 设置串口 path
   * @param {string} value
   * @return
   */
  async setPath(value: string) {
    let isOpened = false;
    if (this.isOpen) {
      isOpened = true;
      await this.close();
    }
    this.options.path = value;
    if (isOpened) {
      await this.open();
    }
  }

  /**
   * @description: 串口写入数据
   * @param {string} value
   * @return
   */
  async write(value: string) {
    if (!this.isOpen) {
      throw new Error(`${this.options.path} is not opened!`);
    }
    return await invoke<number>("plugin:serialport|write", {
      value,
      path: this.options.path,
    });
  }

  /**
   * @description: 写入二进制数据到串口
   * @param {Uint8Array} value
   * @return
   */
  async writeBinary(value: Uint8Array | number[]) {
    if (!this.isOpen) {
      throw new Error(`${this.options.path} is not opened!`);
    }
    if (!(value instanceof Uint8Array || value instanceof Array)) {
      throw new Error("value 参数类型错误! 期望类型: Uint8Array, number[]");
    }
    return await invoke<number>("plugin:serialport|write_binary", {
      value: Array.from(value),
      path: this.options.path,
    });
  }

  sanitizeEventName(input: string): string {
    return input
      .split("")
      .map((char) => {
        if (char === ".") {
          return "_"; // Replace '.' with '_'
        }
        // Allow only alphanumeric characters, '-', '/', ':', and '_'
        return /[a-zA-Z0-9\-\/:_]/.test(char) ? char : "_";
      })
      .join("");
  }
}

export { Serialport };
