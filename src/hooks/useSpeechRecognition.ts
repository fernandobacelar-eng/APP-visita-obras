import { useCallback, useRef, useState } from 'react'

/**
 * Wraps the browser's live SpeechRecognition (webkitSpeechRecognition on
 * Chrome Android). Only works while online — the browser streams audio to a
 * cloud recognizer under the hood. There is no standard API for
 * transcribing a pre-recorded audio blob, so offline voice notes are saved
 * as audio only and transcribed in a future version.
 */
export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const suportado = !!Ctor

  const start = useCallback(() => {
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true

    let acumulado = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i]
        if (resultado.isFinal) {
          acumulado += resultado[0].transcript + ' '
        } else {
          interim += resultado[0].transcript
        }
      }
      setTranscript((acumulado + interim).trim())
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    setTranscript('')
    recognition.start()
    setListening(true)
  }, [Ctor])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { suportado, listening, transcript, start, stop }
}
