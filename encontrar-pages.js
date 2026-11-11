/**
 * Encontra todos os page.tsx dentro da pasta app/
 * que contêm Etapa01A06Simpl
 *
 * Salve em C:\Users\ghenr\sistema-laudos\ e rode:
 *   node encontrar-pages.js
 */

const fs = require('fs')
const path = require('path')

const BASE = path.resolve(__dirname, 'app')

function listar(dir) {
  let resultado = []
  let entradas
  try {
    entradas = fs.readdirSync(dir)
  } catch {
    return resultado
  }
  for (const entrada of entradas) {
    const caminho = path.join(dir, entrada)
    let stat
    try { stat = fs.statSync(caminho) } catch { continue }
    if (stat.isDirectory()) {
      resultado = resultado.concat(listar(caminho))
    } else if (entrada === 'page.tsx') {
      try {
        const conteudo = fs.readFileSync(caminho, 'utf8')
        if (conteudo.includes('Etapa01A06Simpl')) {
          resultado.push(caminho)
        }
      } catch {}
    }
  }
  return resultado
}

const encontrados = listar(BASE)

if (encontrados.length === 0) {
  console.log('Nenhum page.tsx com Etapa01A06Simpl encontrado em:', BASE)
} else {
  console.log('Arquivos encontrados:')
  encontrados.forEach(f => console.log(' ', f))
}
