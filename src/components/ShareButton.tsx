import { useEffect, useState } from "react";

interface Props {
  url: string;
  valor: string;
}

export default function ShareButton({ url, valor }: Props) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof navigator.share === "function");
  }, []);

  function handleShare() {
    navigator.share({
      title: `PIX ${valor}`,
      text: `Pagamento PIX de ${valor}`,
      url,
    });
  }

  return (
    <button
      onClick={handleShare}
      disabled={!supported}
      className="mt-3 w-full cursor-pointer rounded-xl border-2 border-emerald-500 bg-white px-4 py-4 text-[15px] font-semibold tracking-wide text-emerald-600 transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-500/20 active:translate-y-0 disabled:cursor-default disabled:border-gray-200 disabled:text-gray-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-white"
    >
      Compartilhar
    </button>
  );
}
