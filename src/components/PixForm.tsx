import { useState } from "react";

/**
 * Monta o caminho do pixlink a partir dos campos do form.
 * Retorna undefined se a chave estiver vazia ou o valor for invalido.
 * Aceita valor com virgula ou ponto decimal.
 */
export function construirUrl(
  chave: string,
  valor: string,
  descricao = "",
): string | undefined {
  const centavos = Math.round(parseFloat(valor.replace(",", ".")) * 100);
  if (!chave || isNaN(centavos) || centavos <= 0) return undefined;

  let result = `/${encodeURIComponent(chave)}/${centavos}`;
  const d = descricao.trim();
  if (d) result += `?d=${encodeURIComponent(d)}`;
  return result;
}

export default function PixForm() {
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");

  function gerarUrl() {
    const result = construirUrl(chave, valor, descricao);
    if (result) setUrl(result);
  }

  function copiarUrl() {
    if (!url) return;
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Chave PIX */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="chave"
          className="text-[13px] font-medium text-gray-500"
        >
          Chave PIX
        </label>
        <input
          id="chave"
          type="text"
          placeholder="Telefone, CPF ou e-mail"
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
      </div>

      {/* Valor */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="valor"
          className="text-[13px] font-medium text-gray-500"
        >
          Valor (R$)
        </label>
        <input
          id="valor"
          type="text"
          inputMode="decimal"
          placeholder="50,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
      </div>

      {/* Descricao */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="descricao"
          className="text-[13px] font-medium text-gray-500"
        >
          Descricao{" "}
          <span className="font-normal text-gray-300">(opcional)</span>
        </label>
        <input
          id="descricao"
          type="text"
          placeholder="Ex: Almoco"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />
      </div>

      {/* Botao gerar */}
      <button
        onClick={gerarUrl}
        className="w-full cursor-pointer rounded-xl bg-emerald-500 px-4 py-4 text-[15px] font-semibold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 active:translate-y-0"
      >
        Gerar link do PIX
      </button>

      {/* Resultado */}
      {url && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              Link gerado
            </span>
            <a
              href={url}
              className="break-all text-sm font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 transition-colors hover:text-emerald-900"
            >
              {`${typeof window !== "undefined" ? window.location.origin : ""}${url}`}
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copiarUrl}
              className="flex-1 cursor-pointer rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:translate-y-0"
            >
              Copiar link
            </button>
            <a
              href={url}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50"
            >
              Abrir
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
