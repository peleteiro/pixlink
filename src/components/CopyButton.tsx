import { useState } from "react";

export default function CopyButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className={
        copied ? "btn-primary bg-gray-800 hover:bg-gray-800" : "btn-primary"
      }
    >
      {copied ? "Copiado!" : "Copiar PIX Copia e Cola"}
    </button>
  );
}
