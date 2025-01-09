import {
  type ImmutableObject,
  type UseDataSource,
  DataSourceTypes,
  Immutable
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

  // Nouvelles propriétés pour l'édition
  editingEnabled?: boolean
  allowUpdates?: boolean

  // Configuration pour la source de données des votes
  votesDataSourceId?: string
}

export interface EditableInfo {
  enableCreate: boolean
  enableDelete: boolean
  enableEdit: boolean
  enableGeometryEdit: boolean
}

export interface DataSourceConfig extends UseDataSource {
  enableEdit: boolean
  isEditableDataSource: boolean
  supportUpdateRecords: boolean
  editableInfo: EditableInfo
}

// Configuration par défaut
export const getInitialConfig = (): Config => {
  return {
    displayFields: [],
    enableScore: false,
    scoreField: '',
    layoutStyle: 'list',
    editingEnabled: true,
    allowUpdates: true,
    mainDataSource: [],
    votesDataSource: [],
    votesDataSourceId: ''
  }
}

// Types de sources de données supportées
export const supportedDataSourceTypes = Immutable([DataSourceTypes.FeatureLayer])

// Configuration des capacités de la source de données
export const getDataSourceCapabilities = () => {
  return [{
    types: supportedDataSourceTypes,
    fromTypes: supportedDataSourceTypes,
    createable: false,
    updateable: true,
    deletable: false
  }]
}

export type IMConfig = ImmutableObject<Config>
