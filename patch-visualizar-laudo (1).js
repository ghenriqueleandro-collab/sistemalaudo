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

// Este marcador é único no arquivo — aparece exatamente antes da Capa Resumo
const buscaCompleto = `            {/* ══ CAPA RESUMO ══════════════════════════════════════ */}`

const insercaoCompleto = `            {/* ══ APRESENTAÇÃO / INTRODUÇÃO (opcional) ══════════════ */}
            {(dados as any).incluirApresentacao && (dados as any).textoApresentacao && (
              <>
                <div className="mt-10 mb-2 h-[1px] bg-[#C9D3E6]" />
                <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudoCompleto />
                  <h2 className="font-bold text-2xl titulo-laudo mb-6" style={{ color: '#17325C' }}>
                    Apresentação / Introdução
                  </h2>
                  <div className="text-[13px] leading-relaxed whitespace-pre-line text-slate-700">
                    {(dados as any).textoApresentacao}
                  </div>
                  <RodapeLaudo dataLaudo={dados.dataLaudo} />
                </Pagina>
              </>
            )}

            {/* ══ CAPA RESUMO ══════════════════════════════════════ */}`

// ─── Aplica o patch ───────────────────────────────────────────────────────────
function patch(arquivo, busca, insercao, label) {
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

  if (!conteudo.includes(busca)) {
    console.error(`\u274C  ${label}: marcador não encontrado no arquivo.`)
    console.error(`    Primeira linha esperada: "${busca.split('\n')[0]}"`)
    return false
  }

  const resultado = conteudo.replace(busca, insercao)
  fs.writeFileSync(arquivo, resultado, 'utf8')
  console.log(`\u2705  ${label}: patch aplicado com sucesso!`)
  return true
}

console.log('Aplicando patch de Apresentação/Introdução no laudo completo...\n')
const r1 = patch(arquivoCompleto, buscaCompleto, insercaoCompleto, 'Laudo Completo (detalhado)')

if (r1) {
  console.log('\nPronto! Reinicie o servidor Next.js para ver as mudanças:')
  console.log('  npm run dev')
} else {
  console.log('\nNenhum patch foi aplicado.')
}
