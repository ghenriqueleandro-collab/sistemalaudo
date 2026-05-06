export type EtapaIdSimpl =
  | '1-6'
  | '8'
  | '9.1'
  | '9.2'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'

export const ETAPAS_SIMPL: { id: EtapaIdSimpl; titulo: string }[] = [
  { id: '1-6',  titulo: '1 a 6. Identificação e caracterização do imóvel' },
  { id: '8',    titulo: '7. Considerações sobre o mercado' },
  { id: '9.1',  titulo: '8. Metodologia, pesquisas e cálculos' },
  { id: '9.2',  titulo: '9. Cálculo do terreno' },
  { id: '10',   titulo: '10. Cálculo das benfeitorias' },
  { id: '11',   titulo: '11. Valor do imóvel' },
  { id: '12',   titulo: '12. Grau de fundamentação e precisão' },
  { id: '13',   titulo: '13. Conclusão' },
  { id: '14',   titulo: '14. Garantia e anexos' },
]
