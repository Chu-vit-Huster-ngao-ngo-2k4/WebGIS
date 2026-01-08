declare module 'mapnik' {
  export class Map {
    constructor(width: number, height: number);
    load(path: string, callback: (err: any, map: Map) => void): void;
    zoomToBox(bbox: [number, number, number, number]): void;
    render(image: any, options: any, callback: (err: any, result: any) => void): void;
    render(image: any, callback: (err: any, result: any) => void): void;
  }
  export class Image {
    constructor(width: number, height: number);
    encodeSync(format: string): Buffer;
  }
  export class VectorTile {
    constructor(z: number, x: number, y: number);
    getData(): Buffer;
  }
  export function register_default_input_plugins(): void;
}
