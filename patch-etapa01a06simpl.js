
const fs = require('fs')
const path = require('path')

// Caminho do arquivo - ajuste se necessário
const filePath = path.join(__dirname, 'app/components/formulario/simplificado/Etapa01A06Simpl.tsx')

let content = fs.readFileSync(filePath, 'utf-8')

// ── SUBSTITUIÇÃO: SectionCard "Dados do avaliando para cálculo CDDM" ──────────
// Localizar o bloco inteiro e substituir por versão condicional

const OLD_TITLE = '<SectionCard title="Dados do avaliando para cálculo CDDM">'

if (!content.includes(OLD_TITLE)) {
  console.error('❌ SectionCard não encontrado. Verifique o arquivo.')
  process.exit(1)
}

// Encontrar início e fim do SectionCard
const start = content.indexOf(OLD_TITLE)

// Encontrar o </SectionCard> correspondente (pode ter SectionCards aninhados? não nesse caso)
// Contar abertura/fechamento de SectionCard a partir do start
let depth = 0
let pos = start
let end = -1
while (pos < content.length) {
  if (content.startsWith('<SectionCard', pos)) depth++
  if (content.startsWith('</SectionCard>', pos)) {
    depth--
    if (depth === 0) { end = pos + '</SectionCard>'.length; break }
  }
  pos++
}

if (end === -1) {
  console.error('❌ Fechamento do SectionCard não encontrado.')
  process.exit(1)
}

const OLD_BLOCK = content.slice(start, end)

const NEW_BLOCK = `{form.metodoAvaliacao === 'evolutivo' ? (
        <SectionCard title="Dados do avaliando — Método Evolutivo">
          <p className="text-xs text-slate-400 mb-4">
            Variáveis do avaliando usadas no cálculo VEIU (Terreno). Nota 100 = referência neutra.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Área de terreno (m²)</FieldLabel>
              <div className={inputCls() + ' bg-slate-50 text-slate-500 cursor-default'}>
                {form.areaTerrenoTotal || '—'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Preenchida automaticamente das áreas acima.</p>
            </div>
            <div>
              <FieldLabel>Nota local (avaliando)</FieldLabel>
              <input name="notaLocalAvaliando" type="number" placeholder="100"
                value={form.notaLocalAvaliando || ''} onChange={handleChange} className={inputCls()} />
              <p className="text-[11px] text-slate-400 mt-1">Índice de localização. 100 = neutro.</p>
            </div>
            <div>
              <FieldLabel>Nota topografia (avaliando)</FieldLabel>
              <input name="notaTopografiaAvaliando" type="number" placeholder="100"
                value={form.notaTopografiaAvaliando || ''} onChange={handleChange} className={inputCls()} />
              <p className="text-[11px] text-slate-400 mt-1">Plano = 100. Declive/aclive menor que 100.</p>
            </div>
            <div>
              <FieldLabel>Nota visibilidade (avaliando)</FieldLabel>
              <input name="notaVisibilidadeAvaliando" type="number" placeholder="100"
                value={form.notaVisibilidadeAvaliando || ''} onChange={handleChange} className={inputCls()} />
              <p className="text-[11px] text-slate-400 mt-1">Alta visibilidade = 100. Encravado menor que 100.</p>
            </div>
          </div>
        </SectionCard>
      ) : (
        ${OLD_BLOCK}
      )}`

content = content.replace(OLD_BLOCK, NEW_BLOCK)
fs.writeFileSync(filePath, content, 'utf-8')
console.log('✅ Etapa01A06Simpl.tsx atualizado com sucesso!')
