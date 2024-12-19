import { type ImmutableObject } from 'seamless-immutable'
import { type UseDataSource } from 'jimu-core'

export interface Config {
  // Configuration pour la source de données
  useDataSource?: UseDataSource[]

  // Configuration pour l'affichage de la liste
  displayFields: string[]

  // Configuration pour le score
  enableScore: boolean
  scoreField: string

  // Configuration pour la mise en page
  layoutStyle: 'list' | 'grid'
}

export type IMConfig = ImmutableObject<Config>
