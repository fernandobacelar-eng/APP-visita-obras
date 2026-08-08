import { useState } from 'react'
import type { Audio as AudioRegistro, StatusTranscricao } from '../../types'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

function AudioItem({ audio, onRemover }: { audio: AudioRegistro; onRemover: (id: number) => void }) {
  const url = useObjectUrl(audio.blob)

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        {url && <audio controls src={url} className="h-10 flex-1" />}
        <button
          aria-label="Remover áudio"
          onClick={() => audio.id != null && onRemover(audio.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500"
        >
          ×
        </button>
      </div>
      {audio.statusTranscricao === 'transcrito' && audio.transcricao ? (
        <p className="mt-2 text-base text-gray-700">"{audio.transcricao}"</p>
      ) : (
        <p className="mt-2 text-sm font-semibold text-status-em-execucao">
          ⏳ Aguardando transcrição (sem internet no momento da gravação)
        </p>
      )}
    </div>
  )
}

export function AnotacaoVoz({
  audios,
  onGravado,
  onRemover,
}: {
  audios: AudioRegistro[]
  onGravado: (blob: Blob, transcricao: string | null, status: StatusTranscricao) => void
  onRemover: (id: number) => void
}) {
  const online = useOnlineStatus()
  const recorder = useVoiceRecorder()
  const speech = useSpeechRecognition()
  const [processando, setProcessando] = useState(false)

  const gravando = recorder.recording

  async function handleClique() {
    if (!gravando) {
      await recorder.start()
      if (online && speech.suportado) speech.start()
      return
    }

    setProcessando(true)
    if (online && speech.suportado) speech.stop()
    const blob = await recorder.stop()
    setProcessando(false)

    if (!blob) return

    const transcricao = online && speech.suportado ? speech.transcript.trim() : ''
    if (transcricao) {
      onGravado(blob, transcricao, 'transcrito')
    } else {
      onGravado(blob, null, 'pendente')
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-gray-500">
        {online
          ? '🟢 Online — a anotação de voz é transcrita automaticamente.'
          : '🔴 Offline — o áudio será salvo e a transcrição fica pendente.'}
      </p>

      <button
        onClick={handleClique}
        disabled={processando}
        className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold text-white ${
          gravando ? 'animate-pulse bg-status-pendencia' : 'bg-brand active:bg-brand-dark'
        }`}
      >
        {gravando ? '⏹ Parar gravação' : '🎙️ Gravar anotação por voz'}
      </button>

      {recorder.erro && <p className="mt-2 text-sm text-status-pendencia">{recorder.erro}</p>}

      {gravando && online && speech.suportado && (
        <p className="mt-2 rounded-lg bg-gray-100 p-2 text-sm italic text-gray-600">
          {speech.transcript || 'Ouvindo…'}
        </p>
      )}

      {audios.length > 0 && (
        <div className="mt-3 space-y-2">
          {audios.map((a) => (
            <AudioItem key={a.id} audio={a} onRemover={onRemover} />
          ))}
        </div>
      )}
    </div>
  )
}
