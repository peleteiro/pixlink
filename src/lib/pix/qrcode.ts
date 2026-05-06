import QRCode from "qrcode-svg";

/** SVG sem padding para embedar na pagina HTML (o container cuida do spacing) */
export function gerarSvg(payload: string): string {
  const qr = new QRCode({
    content: payload,
    padding: 0,
    width: 280,
    height: 280,
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
    container: "svg-viewbox",
    join: true,
    xmlDeclaration: false,
  });
  return qr.svg();
}

/** SVG com padding e resolução alta para renderizar como PNG standalone */
export function gerarSvgPng(payload: string): string {
  const qr = new QRCode({
    content: payload,
    padding: 4,
    width: 1024,
    height: 1024,
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
    container: "svg-viewbox",
    join: true,
    xmlDeclaration: true,
  });
  return qr.svg();
}
