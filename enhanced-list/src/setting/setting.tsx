import {
  React,
  Immutable,
  DataSourceTypes,
  type IMFieldSchema,
  type UseDataSource,
  type JimuFieldType,
  JimuFieldType as JimuFieldTypes,
  type ImmutableArray,
  AllDataSourceTypes
} from 'jimu-core'
import { type AllWidgetSettingProps } from 'jimu-for-builder'
import { type IMConfig } from '../config'
import {
  SettingSection,
  SettingRow
} from 'jimu-ui/advanced/setting-components'
import {
  Switch,
  Select,
  Label,
  Alert
} from 'jimu-ui'
import { FieldSelector, DataSourceSelector } from 'jimu-ui/advanced/data-source-selector'

// Interface pour l'état local des paramètres
interface State {
  supportedTypes: ImmutableArray<JimuFieldType>
  invalidDataSource: boolean
  showFieldsAlert: boolean
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, State> {
  supportedDsTypes = Immutable([DataSourceTypes.FeatureLayer])

  getDsSupportedTypes = () => {
    return [{
      types: this.supportedDsTypes,
      fromTypes: this.supportedDsTypes,
      createable: false,
      updateable: true,
      deletable: false,
      isOutputFromRepeatedDataSourceContext: false,
      isOutputDataSource: false,
      capabilities: {
        supportsEditing: true,
        supportsCreate: false,
        supportsUpdate: true,
        supportsDelete: false,
        supportsQuery: true
      }
    }]
  }

  constructor (props) {
    super(props)

    // Initialisation de la configuration
    if (!this.props.config) {
      this.props.onSettingChange({
        id: this.props.id,
        config: Immutable({
          useDataSource: [],
          displayFields: [],
          enableScore: false,
          scoreField: '',
          layoutStyle: 'list'
        }),
        useDataSources: []
      })
    }

    this.state = {
      supportedTypes: Immutable([JimuFieldTypes.String, JimuFieldTypes.Number]),
      invalidDataSource: false,
      showFieldsAlert: false
    }
  }

  // Gestion du changement de source de données
  onMainDataSourceChange = async (useDataSources: UseDataSource[]): Promise<void> => {
    if (!useDataSources || useDataSources.length === 0) {
      // Convertir l'objet Immutable en tableau normal
      const votesDataSource = this.props.config.votesDataSource
        ? Immutable.asMutable(this.props.config.votesDataSource)
        : []

      this.props.onSettingChange({
        id: this.props.id,
        useDataSources: votesDataSource,
        config: this.props.config.set('mainDataSource', [])
      })
      return
    }

    try {
      const formattedDataSources = useDataSources.map(ds => ({
        ...ds,
        fields: ['*'],
        useFieldsInPopupInfo: true,
        useFieldsInSymbol: false,
        enableEdit: true,
        enableCreate: false,
        enableDelete: false,
        isEditableDataSource: true,
        supportUpdateRecords: true,
        editableInfo: {
          enableCreate: false,
          enableDelete: false,
          enableEdit: true,
          enableGeometryEdit: false
        }
      }))

      // Convertir la source des votes en tableau normal si elle existe
      const votesDataSource = this.props.config.votesDataSource
        ? Immutable.asMutable(this.props.config.votesDataSource)
        : []

      // Fusionner avec la source des votes
      const combinedDataSources = [
        ...formattedDataSources,
        ...votesDataSource
      ]

      this.props.onSettingChange({
        id: this.props.id,
        useDataSources: combinedDataSources,
        config: this.props.config
          .set('mainDataSource', formattedDataSources)
          .set('enableScore', true)
          .set('editingEnabled', true)
          .set('allowUpdates', true)
      })
    } catch (error) {
      console.error('Erreur lors de la configuration:', error)
      this.setState({ invalidDataSource: true })
    }
  }

  onVotesDataSourceChange = async (useDataSources: UseDataSource[]): Promise<void> => {
    try {
      const votesDs = useDataSources?.[0]

      // Convertir la source principale en tableau normal si elle existe
      const mainDataSource = this.props.config.mainDataSource
        ? Immutable.asMutable(this.props.config.mainDataSource)
        : []

      const combinedDataSources = [
        ...mainDataSource,
        ...useDataSources
      ]

      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config
          .set('votesDataSource', useDataSources)
          .set('votesDataSourceId', votesDs?.dataSourceId),
        useDataSources: combinedDataSources
      })
    } catch (error) {
      console.error('Erreur lors de la configuration de la source des votes:', error)
    }
  }

  // Activation/désactivation du système de score
  onScoreEnableChange = (evt) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('enableScore', evt.target.checked)
    })
  }

  // Modification du champ de score
  onScoreFieldChange = (evt) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('scoreField', evt.target.value)
    })
  }

  // Sélection des champs à afficher
  onDisplayFieldsChange = (allSelectedFields: IMFieldSchema[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('displayFields', allSelectedFields.map(f => f.name))
    })
  }

  // Configuration du style d'affichage
  onLayoutStyleChange = (evt) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('layoutStyle', evt.target.value)
    })
  }

  // Rendu des paramètres
  render () {
    const { config, useDataSources } = this.props
    const { invalidDataSource } = this.state

    return (
      <div className="widget-setting-enhanced-list h-100">
        {/* Section Source de données */}
        <SettingSection title="Source de données">
          <SettingRow>
            <DataSourceSelector
                types={Immutable([AllDataSourceTypes.FeatureLayer])}
                mustUseDataSource={true}
                useDataSources={this.props.config.mainDataSource || Immutable([])}
                onChange={this.onMainDataSourceChange }
                widgetId={this.props.id}
                className="w-100"
                isMultiple={false}
                hideDataView={true}
            />
          </SettingRow>
          {invalidDataSource && (
            <SettingRow>
              <Alert
                type="warning"
                text="La source de données sélectionnée n'est pas valide ou n'est pas accessible."
              />
            </SettingRow>
          )}
        </SettingSection>

        {/* Section Champs à afficher */}
        {useDataSources && useDataSources.length > 0 && (
          <SettingSection title="Champs à afficher">
            <SettingRow>
              <FieldSelector
                useDataSources={this.props.config.mainDataSource || Immutable([])}
                onChange={this.onDisplayFieldsChange}
                selectedFields={this.props.config.mainDataSource?.[0]?.fields || Immutable([])}
                isMultiple={true}
                types={this.state.supportedTypes}
              />
            </SettingRow>
          </SettingSection>
        )}

        {/* Section Style d'affichage */}
        <SettingSection title="Style d'affichage">
          <SettingRow>
            <div className="w-100">
              <Label>Type d'affichage</Label>
              <Select
                className="mt-2"
                value={config.layoutStyle || 'list'}
                onChange={this.onLayoutStyleChange}
              >
                <option value="list">Liste</option>
                <option value="grid">Grille</option>
              </Select>
            </div>
          </SettingRow>
        </SettingSection>

        {/* Section Configuration du Score */}
        <SettingSection title="Configuration du Score">
          <SettingRow>
            <div className="w-100">
              <div className="d-flex justify-content-between w-100">
                <Label>Activer le système de score</Label>
                <Switch
                  checked={config.enableScore}
                  onChange={this.onScoreEnableChange}
                />
              </div>
            </div>
          </SettingRow>

          {config.enableScore && (
            <SettingRow>
              <div className="w-100">
                <Label>Sélection du champ de score</Label>
                <FieldSelector
                  useDataSources={this.props.useDataSources}
                  onChange={(allSelectedFields: IMFieldSchema[]) => {
                    const selectedField = allSelectedFields[0]
                    this.onScoreFieldChange({ target: { value: selectedField?.name || '' } })
                  }}
                  selectedFields={config.scoreField ? Immutable([config.scoreField]) : Immutable([])}
                  isMultiple={false}
                  types={Immutable([JimuFieldTypes.Number])}
                />
                <div className='text-disabled mt-2 small'>
                  Sélectionnez un champ numérique pour stocker le score
                </div>
              </div>
            </SettingRow>
          )}
        </SettingSection>

        <SettingSection title="Configuration des votes">
          <SettingRow>
            <div className="w-100">
              <Label>Source de données des votes</Label>
              <DataSourceSelector
                types={Immutable([AllDataSourceTypes.FeatureLayer])}
                mustUseDataSource={true}
                useDataSources={this.props.config.votesDataSource || Immutable([])}
                onChange={useDataSources => {
                  console.log('Changement de la source des votes:', useDataSources)

                  // Si aucune source n'est sélectionnée (suppression)
                  if (!useDataSources || useDataSources.length === 0) {
                    this.props.onSettingChange({
                      id: this.props.id,
                      config: this.props.config
                        .set('votesDataSource', [])
                        .set('votesDataSourceId', null),
                      useDataSources: this.props.config.mainDataSource
                        ? Immutable.asMutable(this.props.config.mainDataSource)
                        : []
                    })
                    return
                  }

                  const votesDs = useDataSources[0]
                  const mainDataSource = this.props.config.mainDataSource
                    ? Immutable.asMutable(this.props.config.mainDataSource)
                    : []

                  // Configuration complète de la source des votes
                  const formattedVotesSource = {
                    ...votesDs,
                    fields: ['*'],
                    useFieldsInPopupInfo: true,
                    useFieldsInSymbol: false,
                    enableEdit: true,
                    enableCreate: true,
                    enableDelete: false,
                    isEditableDataSource: true,
                    supportUpdateRecords: true,
                    editableInfo: {
                      enableCreate: true,
                      enableDelete: false,
                      enableEdit: true,
                      enableGeometryEdit: false
                    },
                    // Ajout des capacités spécifiques
                    capabilities: {
                      supportsEditing: true,
                      supportsCreate: true,
                      supportsUpdate: true,
                      supportsDelete: false,
                      supportsQuery: true
                    }
                  }

                  this.props.onSettingChange({
                    id: this.props.id,
                    config: this.props.config
                      .set('votesDataSource', [formattedVotesSource])
                      .set('votesDataSourceId', votesDs.dataSourceId),
                    useDataSources: [...mainDataSource, formattedVotesSource]
                  })
                }}
                widgetId={this.props.id}
                className="w-100 mt-2"
                isMultiple={false}
                hideDataView={true}
              />
              <div className='text-disabled mt-2 small'>
                Sélectionnez la source de données qui stockera les votes des utilisateurs
              </div>
            </div>
          </SettingRow>
        </SettingSection>
      </div>
    )
  }
}
