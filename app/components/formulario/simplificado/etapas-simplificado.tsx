export type EtapaIdSimpl =
  | '1-6'
  | '8'
  | '9.1'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'

export const ETAPAS_SIMPL: { id: EtapaIdSimpl; titulo: string }[] = [
  { id: '1-6',  titulo: '1 a 6. Identificação e caracterização do imóvel' },
  { id: '8',    titulo: '7. Descrição do imóvel avaliando' },
  { id: '9.1',  titulo: '8. Metodologia, pesquisas e cálculos' },
  { id: '10',   titulo: '9. Valor do imóvel' },
  { id: '11',   titulo: '10. Grau de fundamentação e precisão' },
  { id: '12',   titulo: '11. Conclusão' },
  { id: '13',   titulo: '12. Garantia' },
  { id: '14',   titulo: '13. Anexos e assinatura' },
]
