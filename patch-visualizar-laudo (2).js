#!/usr/bin/env node
// patch-visualizar-laudo.js
// Adiciona a seção Apresentação/Introdução na visualização HTML
// do laudo completo (detalhado).
//
// Execute: node patch-visualizar-laudo.js
// (na pasta raiz do projeto: C:\Users\ghenr\sistema-laudos\)

const fs = require('fs')
const path = require('path')

// ─── LAUDO COMPLETO (DETALHADO) ──────────────────────────────────────────────
const arquivoCompleto = path.join(process.cwd(), 'app', 'visualizar-laudo', 'detalhado', 'page.tsx')

// ─── Aplica o patch ───────────────────────────────────────────────────────────
function patch(arquivo, label) {
  if (!fs.existsSync(arquivo)) {
    console.error(`\u274C  Arquivo não encontrado: ${arquivo}`)
    return false
  }
  const conteudo = fs.readFileSync(arquivo, 'utf8')

  // Verifica se já foi patchado
  if (conteudo.includes('textoApresentacao') && conteudo.includes('Apresentação / Introdução')) {
    console.log(`\u2705  ${label}: já contém a seção de Apresentação — patch ignorado.`)
    return true
  }

  // Encontra a linha que contém o marcador (independente de indentação)
  const linhas = conteudo.split('\n')
  let idxMarcador = -1
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].includes('{/* ══ CAPA RESUMO ══════════════════════════════════════ */}')) {
      idxMarcador = i
      break
    }
  }

  if (idxMarcador === -1) {
    // Tenta variante sem espaços extras (caso o arquivo use formatação diferente)
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].includes('CAPA RESUMO') && linhas[i].includes('{/*') && linhas[i].includes('*/}')) {
        idxMarcador = i
        break
      }
    }
  }

  if (idxMarcador === -1) {
    console.error(`\u274C  ${label}: marcador CAPA RESUMO não encontrado no arquivo.`)
    // Mostra linhas próximas ao trecho esperado para diagnóstico
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].includes('CAPA RESUMO')) {
        console.log(`    Linha ${i + 1}: ${JSON.stringify(linhas[i])}`)
      }
    }
    return false
  }

  // Detecta a indentação usada nessa linha
  const linhaOriginal = linhas[idxMarcador]
  const indent = linhaOriginal.match(/^(\s*)/)[1]

  // Bloco de Apresentação com a mesma indentação
  const blocoApresentacao = [
    `${indent}{/* ══ APRESENTAÇÃO / INTRODUÇÃO (opcional) ══════════════ */}`,
    `${indent}{(dados as any).incluirApresentacao && (dados as any).textoApresentacao && (`,
    `${indent}  <>`,
    `${indent}    <div className="mt-10 mb-2 h-[1px] bg-[#C9D3E6]" />`,
    `${indent}    <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>`,
    `${indent}      <CabecalhoLaudoCompleto />`,
    `${indent}      <h2 className="font-bold text-2xl titulo-laudo mb-6" style={{ color: '#17325C' }}>`,
    `${indent}        Apresentação / Introdução`,
    `${indent}      </h2>`,
    `${indent}      <div className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">`,
    `${indent}        {(dados as any).textoApresentacao}`,
    `${indent}      </div>`,
    `${indent}      <RodapeLaudo dataLaudo={dados.dataLaudo} />`,
    `${indent}    </Pagina>`,
    `${indent}  </>`,
    `${indent})}`,
    ``,
  ].join('\n')

  // Insere o bloco antes da linha do marcador
  linhas.splice(idxMarcador, 0, ...blocoApresentacao.split('\n').slice(0, -1), '')
  const resultado = linhas.join('\n')
  fs.writeFileSync(arquivo, resultado, 'utf8')
  console.log(`\u2705  ${label}: patch aplicado com sucesso! (linha ${idxMarcador + 1})`)
  return true
}

console.log('Aplicando patch de Apresentação/Introdução no laudo completo...\n')
const r1 = patch(arquivoCompleto, 'Laudo Completo (detalhado)')

if (r1) {
  console.log('\nPronto! Reinicie o servidor Next.js para ver as mudanças:')
  console.log('  npm run dev')
} else {
  console.log('\nNenhum patch foi aplicado.')
}
