/**
 * SALVAR EM: src/app/mapa-elementos/tipos.ts
 *
 * Tipos compartilhados entre page.tsx e MapaLeaflet.tsx para evitar
 * conflito de "Two different types with this name exist".
 */

import type { ElementoCDDM } from '../components/formulario/EtapaCalculoCDDM'

export type ElementoMapa = ElementoCDDM & {
  laudoId: string
  laudoReferencia: string
}

export type { ElementoCDDM }
