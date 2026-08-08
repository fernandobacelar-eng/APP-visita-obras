import { HashRouter, Routes, Route } from 'react-router-dom'
import { ImportScreen } from './features/import/ImportScreen'
import { PavimentosList } from './features/pavimentos/PavimentosList'
import { ServicosList } from './features/servicos/ServicosList'
import { RegistroServico } from './features/registro/RegistroServico'
import { ResumoVisita } from './features/resumo/ResumoVisita'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ImportScreen />} />
        <Route path="/pavimentos" element={<PavimentosList />} />
        <Route path="/pavimentos/:pavimentoId" element={<ServicosList />} />
        <Route path="/servicos/:servicoId" element={<RegistroServico />} />
        <Route path="/resumo" element={<ResumoVisita />} />
      </Routes>
    </HashRouter>
  )
}

export default App
