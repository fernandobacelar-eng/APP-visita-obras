# Visita à Obra

PWA (instalável no Android) para registrar visitas a obra, pavimento por pavimento e
serviço por serviço: importa a situação da obra de uma planilha Excel, guia a visita e
permite registrar foto, anotação de texto e anotação de voz para cada serviço — tudo
funcionando offline.

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
```

Para testar como PWA de verdade (service worker só é gerado no build):

```bash
npm run build
npm run preview   # http://localhost:4173
```

No celular Android, abra a URL publicada no Chrome e use "Adicionar à tela inicial" para
instalar.

## Formato da planilha de importação

O app lê o painel de curva física da obra direto no formato que a ferramenta de
planejamento já exporta (`.xlsx`), sem precisar de um template à parte:

- **Coluna B** (a partir da linha 4): nome/cota de cada pavimento (ex: `3000`, `COBERTA`).
- **Linha 3** (a partir da coluna C): nome de cada serviço, um por coluna.
- Uma célula **sem preenchimento** e sem texto = esse serviço não se aplica àquele
  pavimento (não entra no app).
- Uma célula **preenchida** (qualquer cor — a cor em si não importa) representa o serviço
  naquele pavimento. Dentro de cada coluna:
  - texto **"EXECUÇÃO"** → esse é o pavimento onde a frente de execução está agora;
  - texto **"RABO"** → pendência/retrabalho nesse pavimento;
  - célula preenchida sem texto especial → `concluído` se estiver abaixo da frente
    "EXECUÇÃO" da coluna (pavimento mais baixo, já construído) ou `não iniciado` se estiver
    acima; se a coluna não tiver nenhuma célula "EXECUÇÃO", todas as células preenchidas
    contam como `concluído` (serviço já passou por ali por completo).

Isso assume que a planilha lista os pavimentos do mais alto (topo) para o mais baixo/térreo
(base), como no arquivo usado para validar o parser.

## Como os dados são guardados

Tudo fica local no navegador (IndexedDB via Dexie), incluindo fotos e áudios — não há
backend nem upload para nenhum servidor. Importar uma nova planilha substitui a visita em
andamento e os registros feitos nela.

## Anotação de voz

Com internet no momento da gravação, a transcrição acontece na hora usando o
reconhecimento de voz do navegador (Web Speech API — funciona no Chrome Android, não
precisa de backend). Sem internet, o áudio é salvo normalmente e fica marcado como
"aguardando transcrição"; a transcrição automática desses áudios pendentes é prevista
para uma versão futura, junto com a sincronização.

## Fora de escopo desta versão

- Lógica da seção "Verificação QDP" (só o campo reservado).
- Sincronização com Google Drive.
- Transcrição de áudios gravados offline.

## Nota sobre a dependência `xlsx`

O pacote `xlsx` (SheetJS) disponível no npm tem CVEs conhecidas de prototype pollution e
ReDoS que só afetam o parsing de arquivos adversariais; aqui ele só processa arquivos que
o próprio usuário seleciona localmente, então o risco é baixo. Se quiser eliminar o aviso
do `npm audit`, troque a instalação pelo pacote publicado no CDN oficial do SheetJS
(`https://cdn.sheetjs.com/`), que corrige essas CVEs.
