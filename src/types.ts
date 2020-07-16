export * from 'starkware-types';

export interface StarkwareAccountMapping {
  [path: string]: string;
}

export interface Store {
  set(key: string, data: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<void>;
}
