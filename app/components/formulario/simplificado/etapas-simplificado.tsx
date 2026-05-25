export type EtapaIdSimpl =
  | 'cliente-status'
  | '1-6'
  | '8'
  | '9.1'
  | '11'
  | '12'
  | '13'
  | '14'

export const ETAPAS_SIMPL: { id: EtapaIdSimpl; titulo: string }[] = [
  { id: 'cliente-status', titulo: 'Cliente & status' },
  { id: '1-6',  titulo: '1 a 6. Identificação e caracterização do imóvel' },
  { id: '8',    titulo: '7. Descrição do imóvel avaliando' },
  { id: '9.1',  titulo: '8. Metodologia, pesquisas e cálculos' },
  { id: '11',   titulo: '9. Grau de fundamentação e precisão' },
  { id: '12',   titulo: '10. Conclusão' },
  { id: '13',   titulo: '11. Garantia' },
  { id: '14',   titulo: '12. Anexos e assinatura' },
]
