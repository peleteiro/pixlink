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
      className={`w-full cursor-pointer rounded-xl px-4 py-4 text-[15px] font-semibold tracking-wide text-white transition-all ${
        copied
          ? "bg-gray-800"
          : "bg-emerald-500 shadow-emerald-500/30 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg active:translate-y-0"
      }`}
    >
      {copied ? "Copiado!" : "Copiar PIX Copia e Cola"}
    </button>
  );
}
