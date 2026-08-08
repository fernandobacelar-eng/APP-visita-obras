export function QdpPlaceholder({
  valor,
  onChange,
}: {
  valor: string
  onChange: (texto: string) => void
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 p-3">
      <p className="text-sm font-semibold text-gray-500">Em breve — a lógica completa de verificação será adicionada numa próxima etapa.</p>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Espaço reservado para a Verificação QDP…"
        rows={3}
        className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-gray-50 p-3 text-base text-gray-600"
      />
    </div>
  )
}
