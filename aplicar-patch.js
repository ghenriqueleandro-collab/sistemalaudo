/**
 * Patch: adiciona incluirApresentacao e textoApresentacao no <Etapa01A06Simpl>
 *
 * Salve em C:\Users\ghenr\sistema-laudos\ e rode:
 *   node aplicar-patch.js
 */

const fs = require('fs')
const path = require('path')

const BASE = path.resolve(__dirname)

const ARQUIVOS = [
  path.join(BASE, 'app', 'laudo', 'simplificado', 'page.tsx'),
  path.join(BASE, 'app', 'novo-laudo', 'page.tsx'),
]

const BUSCA = [
  '              tipoImovelCDDM={(form as any).tipoImovelCDDM}',
  '              setTipoImovelCDDM={setTipoImovelCDDM}',
  '            />',
].join('\n')

const SUBSTITUTO = [
  '              tipoImovelCDDM={(form as any).tipoImovelCDDM}',
  '              setTipoImovelCDDM={setTipoImovelCDDM}',
  '              incluirApresentacao={(form as any).incluirApresentacao}',
  '              textoApresentacao={(form as any).textoApresentacao}',
  '            />',
].join('\n')

console.log('Pasta base:', BASE)
console.log('')

let ok = 0

for (const arquivo of ARQUIVOS) {
  console.log('Verificando:', arquivo)

  let conteudo
  try {
    conteudo = fs.readFileSync(arquivo, 'utf8')
  } catch (e) {
    console.log('  ❌ Erro ao ler:', e.message)
    console.log('')
    continue
  }

  const usaCRLF = conteudo.includes('\r\n')
  const normalizado = conteudo.replace(/\r\n/g, '\n')

  if (!normalizado.includes(BUSCA)) {
    if (normalizado.includes('incluirApresentacao')) {
      console.log('  ✅ Já aplicado — nenhuma alteração necessária.')
    } else {
      console.log('  ⚠️  Trecho não encontrado. Verifique manualmente.')
    }
    console.log('')
    continue
  }

  let novo = normalizado.replace(BUSCA, SUBSTITUTO)
  if (usaCRLF) novo = novo.replace(/\n/g, '\r\n')

  fs.writeFileSync(arquivo, novo, 'utf8')
  console.log('  ✅ Patch aplicado!')
  ok++
  console.log('')
}

console.log(`Resultado: ${ok} de ${ARQUIVOS.length} arquivo(s) atualizados.`)
