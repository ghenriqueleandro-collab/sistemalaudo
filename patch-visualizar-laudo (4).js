#!/usr/bin/env node
// patch-visualizar-laudo.js
// Execute: node patch-visualizar-laudo.js
// (na pasta raiz: C:\Users\ghenr\sistema-laudos\)

const fs = require('fs')
const path = require('path')

const arquivoCompleto = path.join(process.cwd(), 'app', 'visualizar-laudo', 'detalhado', 'page.tsx')

function patch(arquivo, label) {
  if (!fs.existsSync(arquivo)) {
    console.error('\u274C  Arquivo nao encontrado: ' + arquivo)
    return false
  }

  const conteudo = fs.readFileSync(arquivo, 'utf8')

  if (conteudo.includes('textoApresentacao') && conteudo.includes('Apresentacao / Introducao') || conteudo.includes('Apresentação / Introdução')) {
    console.log('\u2705  ' + label + ': ja contem Apresentacao — patch ignorado.')
    return true
  }

  const linhas = conteudo.split('\n')

  // Busca qualquer linha que contenha a palavra CAPA RESUMO dentro de um comentario JSX
  let idxAlvo = -1
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    if (l.indexOf('CAPA RESUMO') !== -1 && l.indexOf('{/*') !== -1 && l.indexOf('*/}') !== -1) {
      idxAlvo = i
      break
    }
  }

  if (idxAlvo === -1) {
    console.error('\u274C  Marcador CAPA RESUMO nao encontrado.')
    console.log('Primeiras 5 linhas que contem "CAPA":')
    let count = 0
    for (let i = 0; i < linhas.length && count < 5; i++) {
      if (linhas[i].indexOf('CAPA') !== -1) {
        console.log('  Linha ' + (i+1) + ': ' + linhas[i])
        count++
      }
    }
    return false
  }

  const indent = linhas[idxAlvo].match(/^(\s*)/)[1]
  console.log('\u2705  Marcador encontrado na linha ' + (idxAlvo + 1) + ', indentacao: ' + indent.length + ' espacos')

  const i = indent
  const bloco = [
    i + '{/* \u2550\u2550 APRESENTA\u00C7\u00C3O / INTRODU\u00C7\u00C3O (opcional) \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}',
    i + '{(dados as any).incluirApresentacao && (dados as any).textoApresentacao && (',
    i + '  <>',
    i + '    <div className="mt-10 mb-2 h-[1px] bg-[#C9D3E6]" />',
    i + '    <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>',
    i + '      <CabecalhoLaudoCompleto />',
    i + '      <h2 className="font-bold text-2xl titulo-laudo mb-6" style={{ color: \'#17325C\' }}>',
    i + '        Apresenta\u00e7\u00e3o / Introdu\u00e7\u00e3o',
    i + '      </h2>',
    i + '      <div className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">',
    i + '        {(dados as any).textoApresentacao}',
    i + '      </div>',
    i + '      <RodapeLaudo dataLaudo={dados.dataLaudo} />',
    i + '    </Pagina>',
    i + '  </>',
    i + ')}',
    '',
  ]

  linhas.splice(idxAlvo, 0, ...bloco)
  fs.writeFileSync(arquivo, linhas.join('\n'), 'utf8')
  console.log('\u2705  Patch aplicado com sucesso!')
  return true
}

console.log('Aplicando patch de Apresentacao/Introducao...\n')
const ok = patch(arquivoCompleto, 'Laudo Completo (detalhado)')
if (ok) {
  console.log('\nReinicie o servidor:')
  console.log('  npm run dev')
}
