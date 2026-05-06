import { useMemo, useState } from "react";
import CopyButton from "@/components/CopyButton";
import { aplicar, type Item, parseEntrada } from "@/lib/calc";
import { gerarPayloadPix } from "@/lib/pix/payload";
import { gerarSvg } from "@/lib/pix/qrcode";
import { centavosParaUrl, formatValor } from "@/lib/pix/valor";

interface Props {
  /** Chave PIX ja normalizada (ex: +5511912345678, 11144477735). */
  chave: string;
  /** Rotulo do tipo de chave (ex: "Telefone", "CPF"). */
  label: string;
  /** Chave formatada para exibicao. */
  display: string;
}

function descricaoItem(item: Item): string {
  if (item.op === "+") return `+ ${formatValor(item.centavos)}`;
  if (item.op === "-") return `− ${formatValor(item.centavos)}`;
  if (item.op === "*") return `× ${item.fator.toLocaleString("pt-BR")}`;
  return `÷ ${item.divisor.toLocaleString("pt-BR")}`;
}

export default function PixCalculator({ chave, label, display }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [erro, setErro] = useState(false);

  const total = useMemo(() => itens.reduce(aplicar, 0), [itens]);
  const totalFormatado = useMemo(() => formatValor(total), [total]);

  // Regenera payload + SVG sempre que o total muda — esse e o "live update"
  // do QR Code conforme itens sao adicionados ou removidos.
  const { payload, svg } = useMemo(() => {
    if (total <= 0) return { payload: "", svg: "" };
    const p = gerarPayloadPix(chave, total);
    return { payload: p, svg: gerarSvg(p) };
  }, [chave, total]);

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const item = parseEntrada(inputValue);
    if (!item) {
      setErro(true);
      return;
    }
    setItens((prev) => [...prev, item]);
    setInputValue("");
    setErro(false);
  }

  function remover(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function limpar() {
    setItens([]);
    setInputValue("");
    setErro(false);
  }

  const linkPermanente =
    total > 0
      ? `/${encodeURIComponent(chave)}/${centavosParaUrl(total)}`
      : undefined;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-400 px-8 py-7 text-center">
        <h1 className="mb-2 text-sm font-semibold tracking-widest text-white/85 uppercase">
          Pagamento via PIX
        </h1>
        <div className="text-[40px] font-bold tracking-tight text-white">
          {totalFormatado}
        </div>
      </div>

      {/* Body */}
      <div className="p-8">
        {/* QR Code (live) ou placeholder enquanto total for zero */}
        {total > 0 ? (
          <div
            role="img"
            aria-label={`QR Code PIX de ${totalFormatado}`}
            className="mb-6 flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-4 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="mb-6 flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
            Adicione um valor abaixo para gerar o QR Code
          </div>
        )}

        {/* Info da chave + total */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-medium text-gray-400">
              {label}
            </span>
            <span className="text-sm font-semibold break-all text-gray-900">
              {display}
            </span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-medium text-gray-400">Total</span>
            <span className="text-sm font-semibold text-gray-900">
              {totalFormatado}
            </span>
          </div>
        </div>

        {/* Input + adicionar */}
        <form onSubmit={adicionar} className="flex flex-col gap-1.5">
          <label
            htmlFor="valor-calc"
            className="text-[13px] font-medium text-gray-500"
          >
            Adicionar valor (R$)
          </label>
          <div className="flex gap-2">
            <input
              id="valor-calc"
              type="text"
              inputMode="decimal"
              placeholder="0,00 ou expressao"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (erro) setErro(false);
              }}
              aria-invalid={erro ? true : undefined}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm text-gray-900 transition-colors outline-none placeholder:text-gray-300 focus:ring-2 ${
                erro
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400/20"
                  : "border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
              }`}
            />
            <button
              type="submit"
              aria-label="Adicionar item"
              className="cursor-pointer rounded-lg bg-emerald-500 px-5 text-xl font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              +
            </button>
          </div>
          {erro ? (
            <p className="text-xs text-rose-600">
              Expressao invalida. Use numeros, <code>+ − × ÷</code> e
              parenteses.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Aceita expressoes:{" "}
              <code className="text-emerald-700">100 * 4</code>,{" "}
              <code className="text-emerald-700">* 4</code> (sobre o total),{" "}
              <code className="text-emerald-700">(5 * 2) + 1000 / 2</code>.
            </p>
          )}
        </form>

        {/* Historico */}
        {itens.length > 0 && (
          <div className="mt-5 rounded-xl bg-gray-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-wide text-gray-400 uppercase">
                Itens
              </h2>
              <button
                type="button"
                onClick={limpar}
                className="cursor-pointer text-xs font-medium text-gray-400 transition-colors hover:text-rose-600"
              >
                Limpar tudo
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {itens.map((item, idx) => {
                const desc = descricaoItem(item);
                return (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {desc}
                    </span>
                    <button
                      type="button"
                      onClick={() => remover(idx)}
                      aria-label={`Remover ${desc}`}
                      className="cursor-pointer rounded-md px-2 text-base text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-gray-200 px-1 pt-3">
              <span className="text-[13px] font-medium text-gray-400">
                Total
              </span>
              <span className="text-base font-semibold text-gray-900">
                {totalFormatado}
              </span>
            </div>
          </div>
        )}

        {/* Acoes (so com total > 0) */}
        {total > 0 && payload && linkPermanente && (
          <div className="mt-5">
            <CopyButton payload={payload} />
            <a
              href={linkPermanente}
              className="btn-secondary mt-3 block text-center"
            >
              Abrir link permanente
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-6 text-center text-xs text-gray-300">
        <a href="/" className="transition-colors hover:text-emerald-500">
          Crie sua URL de PIX tambem
        </a>
      </div>
    </div>
  );
}
