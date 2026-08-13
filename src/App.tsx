import { HashRouter, Routes, Route } from 'react-router-dom'
import { ImportScreen } from './features/import/ImportScreen'
import { VisitasAnteriores } from './features/visitas/VisitasAnteriores'
import { PavimentosList } from './features/pavimentos/PavimentosList'
import { AnotacoesGeraisPavimento } from './features/pavimentos/AnotacoesGeraisPavimento'
import { ServicosList } from './features/servicos/ServicosList'
import { RegistroServico } from './features/registro/RegistroServico'
import { ResumoVisita } from './features/resumo/ResumoVisita'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ImportScreen />} />
        <Route path="/visitas" element={<VisitasAnteriores />} />
        <Route path="/visitas/:visitaId/pavimentos" element={<PavimentosList />} />
        <Route path="/visitas/:visitaId/resumo" element={<ResumoVisita />} />
        <Route path="/pavimentos/:pavimentoId" element={<ServicosList />} />
        <Route path="/pavimentos/:pavimentoId/anotacoes" element={<AnotacoesGeraisPavimento />} />
        <Route path="/servicos/:servicoId" element={<RegistroServico />} />
      </Routes>
    </HashRouter>
  )
}

export default App
