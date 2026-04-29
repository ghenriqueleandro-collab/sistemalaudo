export type EtapaId =
  | '1-6'
  | '7'
  | '8'
  | '9'
  | '9.1'
  | '9.2'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'

export const ETAPAS: { id: EtapaId; titulo: string }[] = [
  { id: '1-6', titulo: '1 a 6. Identificação e caracterização do imóvel' },
  { id: '7', titulo: '7. Acabamentos' },
  { id: '8', titulo: '8. Considerações sobre o mercado' },
  { id: '9', titulo: '9. Glossário de termos técnicos (ABNT NBR 14653-2)' },
  { id: '9.1', titulo: '10. Metodologia, pesquisas e cálculos' },
  { id: '9.2', titulo: '10.1. Cálculo do terreno' },
  { id: '10', titulo: '10.2. Cálculo das benfeitorias' },
  { id: '11', titulo: '11. Valor do imóvel' },
  { id: '12', titulo: '12. Grau de fundamentação e precisão' },
  { id: '13', titulo: '13. Conclusão' },
  { id: '14', titulo: '14. Garantia' },
]