#!/usr/bin/env node
// patch-visualizar-laudo.js — versão diagnóstico + patch robusto
// Execute: node patch-visualizar-laudo.js
// (na pasta raiz: C:\Users\ghenr\sistema-laudos\)

const fs = require('fs')
const path = require('path')

const arquivoCompleto = path.join(process.cwd(), 'app', 'visualizar-laudo', 'detalhado', 'page.tsx')

function patch(arquivo, label) {
  if (!fs.existsSync(arquivo)) {
    console.error(`\u274C  Arquivo não encontrado: ${arquivo}`)
    return false
  }

  const conteudo = fs.readFileSync(arquivo, 'utf8')

  // Já patchado?
  if (conteudo.includes('textoApresentacao') && conteudo.includes('Apresentação / Introdução')) {
    console.log(`\u2705  ${label}: já contém Apresentação — patch ignorado.`)
    return true
  }

  console.log(`\n--- DIAGNÓSTICO do arquivo ---`)
  console.log(`Tamanho: ${conteudo.length} bytes, ${conteudo.split('\n').length} linhas`)

  // Busca por qualquer variação do marcador CAPA RESUMO
  const linhas = conteudo.split('\n')
  const candidatas = []
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    if (l.includes('CAPA RESUMO') || l.includes('Capa Resumo') || l.includes('capa-resumo')) {
      candidatas.push({ idx: i, linha: l })
    }
  }

  console.log(`\nLinhas com "CAPA RESUMO" encontradas: ${candidatas.length}`)
  candidatas.forEach(c => {
    console.log(`  Linha ${c.idx + 1}: ${JSON.stringify(c.linha)}`)
  })

  // Busca o comentário JSX {/* ... CAPA RESUMO ... */}
  let idxComentario = -1
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    if (l.includes('{/*') && l.includes('CAPA RESUMO') && l.includes('*/}')) {
      idxComentario = i
      break
    }
  }

  // Fallback: primeira linha que tem apenas "CAPA RESUMO" com ══
  if (idxComentario === -1) {
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i]
      if (l.includes('CAPA RESUMO') && (l.includes('══') || l.includes('=='))) {
        idxComentario = i
        break
      }
    }
  }

  if (idxComentario === -1) {
    console.error(`\n\u274C  Nenhum marcador de CAPA RESUMO encontrado. Exibindo linhas 1030-1040 do arquivo:`)
    for (let i = 1029; i <= 1040 && i < linhas.length; i++) {
      console.log(`  Linha ${i + 1}: ${JSON.stringify(linhas[i])}`)
    }
    console.error(`\nEnvie essa saída para diagnóstico.`)
    return false
  }

  const indent = linhas[idxComentario].match(/^(\s*)/)[1]
  console.log(`\n\u2705  Marcador encontrado na linha ${idxComentario + 1}`)
  console.log(`   Indentação: ${JSON.stringify(indent)} (${indent.length} chars)`)

  const i = indent
  const bloco = [
    `${i}{/* ══ APRESENTAÇÃO / INTRODUÇÃO (opcional) ══════════════ */}`,
    `${i}{(dados as any).incluirApresentacao && (dados as any).textoApresentacao && (`,
    `${i}  <>`,
    `${i}    <div className="mt-10 mb-2 h-[1px] bg-[#C9D3E6]" />`,
    `${i}    <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>`,
    `${i}      <CabecalhoLaudoCompleto />`,
    `${i}      <h2 className="font-bold text-2xl titulo-laudo mb-6" style={{ color: '#17325C' }}>`,
    `${i}        Apresentação / Introdução`,
    `${i}      </h2>`,
    `${i}      <div className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">`,
    `${i}        {(dados as any).textoApresentacao}`,
    `${i}      </div>`,
    `${i}      <RodapeLaudo dataLaudo={dados.dataLaudo} />`,
    `${i}    </Pagina>`,
    `${i}  </>`,
    `${i})}`,
    ``,
  ]

  linhas.splice(idxComentario, 0, ...bloco)
  fs.writeFileSync(arquivo, linhas.join('\n'), 'utf8')
  console.log(`\u2705  Patch aplicado com sucesso!`)
  return true
}

console.log('Aplicando patch de Apresentação/Introdução...\n')
const ok = patch(arquivoCompleto, 'Laudo Completo (detalhado)')

if (ok) {
  console.log('\nReinicie o servidor:')
  console.log('  npm run dev')
}
