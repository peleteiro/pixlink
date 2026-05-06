import { useState } from "react";

interface Props {
  url: string;
  valor: string;
}

export default function ShareButton({ url, valor }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Usa navigator.share quando disponivel (mobile); caso contrario copia
    // a URL no clipboard. Assim o botao sempre renderiza com o mesmo
    // tamanho — sem flash de "disabled" no SSR nem layout shift.
    const data = {
      title: `PIX ${valor}`,
      text: `Pagamento PIX de ${valor}`,
      url,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(data);
        return;
      } catch {
        // Usuario cancelou (AbortError) ou share falhou — nao cai no fallback.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem suporte a clipboard API — nada a fazer aqui.
    }
  }

  return (
    <button onClick={handleShare} className="btn-secondary mt-3">
      {copied ? "Link copiado!" : "Compartilhar link"}
    </button>
  );
}
