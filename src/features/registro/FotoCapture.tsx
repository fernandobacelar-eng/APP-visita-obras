import { useRef, useState } from 'react'
import type { Foto } from '../../types'
import { useObjectUrl } from '../../hooks/useObjectUrl'

function FotoThumb({
  foto,
  onRemover,
  onLegendaChange,
}: {
  foto: Foto
  onRemover: (id: number) => void
  onLegendaChange: (id: number, legenda: string) => void
}) {
  const url = useObjectUrl(foto.blob)
  const [ampliada, setAmpliada] = useState(false)
  const [legenda, setLegenda] = useState(foto.legenda)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLegendaChange(texto: string) {
    setLegenda(texto)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onLegendaChange(foto.id, texto), 500)
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200">
        {url && (
          <img
            src={url}
            alt="Foto do serviço"
            className="h-full w-full object-cover"
            onClick={() => setAmpliada(true)}
          />
        )}
        <button
          aria-label="Remover foto"
          onClick={() => foto.id != null && onRemover(foto.id)}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg font-bold text-white"
        >
          ×
        </button>
      </div>
      <input
        value={legenda}
        onChange={(e) => handleLegendaChange(e.target.value)}
        placeholder="Legenda da foto…"
        className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
      />
      {ampliada && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setAmpliada(false)}
        >
          <img src={url} alt="Foto ampliada" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}

export function FotoCapture({
  fotos,
  onAdicionar,
  onRemover,
  onLegendaChange,
}: {
  fotos: Foto[]
  onAdicionar: (files: FileList) => void
  onRemover: (id: number) => void
  onLegendaChange: (id: number, legenda: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onAdicionar(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand bg-brand/5 text-lg font-semibold text-brand active:bg-brand/10"
      >
        📷 Tirar foto
      </button>

      {fotos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {fotos.map((f) => (
            <FotoThumb key={f.id} foto={f} onRemover={onRemover} onLegendaChange={onLegendaChange} />
          ))}
        </div>
      )}
    </div>
  )
}
