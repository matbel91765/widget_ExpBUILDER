import {
  type ImmutableObject,
  type UseDataSource
} from 'jimu-core'

export interface Config {
  // Configuration pour la source de données
  mainDataSource?: UseDataSource[] // Pour la source principale
  votesDataSource?: UseDataSource[] // Pour la source des votes

  // Configuration pour l'affichage de la liste
  displayFields: string[]

  // Configuration pour le score
  enableScore: boolean
  scoreField: string

  // Configuration pour la mise en page
  layoutStyle: 'list' | 'grid'

  // Configuration pour la source de données des votes
  votesDataSourceId?: string
}

export type IMConfig = ImmutableObject<Config>
