export function AnotacaoTexto({
  valor,
  onChange,
}: {
  valor: string
  onChange: (texto: string) => void
}) {
  return (
    <textarea
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Digite suas observações sobre este serviço…"
      rows={5}
      className="w-full rounded-xl border-2 border-gray-300 p-3 text-lg leading-relaxed"
    />
  )
}
