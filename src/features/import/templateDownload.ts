import * as XLSX from 'xlsx'

export function baixarModeloPlanilha() {
  const dados = [
    ['Pavimento', 'Serviço', 'Status', 'Observação'],
    ['Térreo', 'Alvenaria', 'Concluído', ''],
    ['1º Pavimento', 'Alvenaria', 'Em execução', ''],
    ['1º Pavimento', 'Instalação Elétrica', 'Não iniciado', ''],
    ['2º Pavimento', 'Estrutura', 'Pendência', 'Ex: aguardando concretagem'],
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(dados)
  worksheet['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 34 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Situação da Obra')
  XLSX.writeFile(workbook, 'modelo-visita-obra.xlsx')
}
