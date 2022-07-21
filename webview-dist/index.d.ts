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

interface InvokeResult {
  code: number,
  message: string,
  [key: string]:any
}

export declare function execute(): Promise<void>
export declare function open(options: OpenOption): Promise<InvokeResult>

export declare function close(path: string): Promise<InvokeResult>

export declare function write(options: WriteOption): Promise<InvokeResult>

export declare function read(options: ReadOptions): Promise<InvokeResult> 

export declare function listen<T>(
  event: string,
  handler: (...args: any[]) => void,
): Promise<InvokeResult>

