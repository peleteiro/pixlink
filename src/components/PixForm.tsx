import { useState } from "react";
import { MAX_CENTAVOS, centavosParaUrl, parsearChave } from "@/lib/pix";

export type ErroForm = "chave-vazia" | "chave-invalida" | "valor-invalido";

/**
 * Valida os campos do form e monta o caminho do pixlink. Retorna a URL
 * gerada ou o codigo de erro especifico pra feedback no form.
 *
 * No valor, so digitos e virgula importam: a virgula separa os centavos
 * e qualquer outro caractere ("R$", ".", "$", espacos, etc.) e ignorado.
 * Como conveniencia, se o valor terminar com ".XX" (ponto + dois digitos)
 * tratamos esse ponto como virgula — comum ao colar valores formatados
 * em ingles. Valores negativos viram positivos (o "-" e ignorado).
 */
export function construirUrl(
  chave: string,
  valor: string,
  descricao = "",
): { url: string } | { erro: ErroForm } {
  if (!chave.trim()) return { erro: "chave-vazia" };
  if (!parsearChave(chave)) return { erro: "chave-invalida" };

  const normalizado = valor.replace(/\.(\d{2})$/, ",$1");
  const limpo = normalizado.replace(/[^\d,]/g, "").replace(",", ".");
  const centavos = Math.round(parseFloat(limpo) * 100);
  if (isNaN(centavos) || centavos <= 0 || centavos > MAX_CENTAVOS)
    return { erro: "valor-invalido" };

  let url = `/${encodeURIComponent(chave)}/${centavosParaUrl(centavos)}`;
  const d = descricao.trim();
  if (d) url += `?d=${encodeURIComponent(d)}`;
  return { url };
}

const MENSAGENS_ERRO: Record<ErroForm, string> = {
  "chave-vazia": "Informe a chave PIX.",
  "chave-invalida": "Chave invalida. Use telefone, CPF, CNPJ, e-mail ou UUID.",
  "valor-invalido": "Informe um valor valido maior que zero.",
};

export default function PixForm() {
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState<ErroForm | undefined>(undefined);

  function gerarUrl() {
    const result = construirUrl(chave, valor, descricao);
    if ("erro" in result) {
      setErro(result.erro);
      setUrl("");
      return;
    }
    setErro(undefined);
    setUrl(result.url);
  }

  function copiarUrl() {
    if (!url) return;
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
  }

  const erroChave =
    erro === "chave-vazia" || erro === "chave-invalida" ? erro : undefined;
  const erroValor = erro === "valor-invalido" ? erro : undefined;

  const inputBase =
    "rounded-lg border px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 focus:ring-2";
  const inputOk =
    "border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20";
  const inputErr =
    "border-rose-400 focus:border-rose-500 focus:ring-rose-400/20";

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
          placeholder="Telefone, CPF, CNPJ, e-mail ou chave aleatoria"
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          aria-invalid={erroChave ? true : undefined}
          className={`${inputBase} ${erroChave ? inputErr : inputOk}`}
        />
        {erroChave && (
          <p className="text-xs text-rose-600">{MENSAGENS_ERRO[erroChave]}</p>
        )}
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
          aria-invalid={erroValor ? true : undefined}
          className={`${inputBase} ${erroValor ? inputErr : inputOk}`}
        />
        {erroValor && (
          <p className="text-xs text-rose-600">{MENSAGENS_ERRO[erroValor]}</p>
        )}
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
          className={`${inputBase} ${inputOk}`}
        />
      </div>

      <button onClick={gerarUrl} className="btn-primary">
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
