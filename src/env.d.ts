/// <reference types="astro/client" />

declare module "@resvg/resvg-wasm/index_bg.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

declare module "qrcode-svg" {
  interface Options {
    content: string;
    padding?: number;
    width?: number;
    height?: number;
    color?: string;
    background?: string;
    ecl?: "L" | "M" | "Q" | "H";
    container?: "svg" | "svg-viewbox" | "g" | "none";
    join?: boolean;
    xmlDeclaration?: boolean;
  }

  class QRCode {
    constructor(options: Options | string);
    svg(options?: { container?: string }): string;
  }

  export default QRCode;
}
