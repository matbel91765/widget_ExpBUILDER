import {
  React,
  Immutable,
  DataSourceTypes,
  type IMFieldSchema,
  type UseDataSource,
  type JimuFieldType,
  DataSourceManager,
  JimuFieldType as JimuFieldTypes,
  type ImmutableArray,
  AllDataSourceTypes,
  type FeatureLayerDataSource,
  type QueriableDataSource
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

  checkEditingCapabilities = async (dataSourceId: string) => {
    const ds = DataSourceManager.getInstance().getDataSource(dataSourceId)

    if (!ds) {
      console.error('Source de données non trouvée')
      return false
    }

    const isFeatureLayer = ds.type === DataSourceTypes.FeatureLayer

    if (!isFeatureLayer) {
      console.error('La source n\'est pas une Feature Layer')
      return false
    }

    const isQueriable = 'query' in ds
    const canUpdate = 'updateRecords' in ds

    if (isFeatureLayer && isQueriable) {
      const featureLayer = ds as FeatureLayerDataSource & QueriableDataSource
      const layerInfo = featureLayer.getLayerDefinition()
      const capabilities = layerInfo?.capabilities?.split(',') || []

      console.log('Informations de la couche:', {
        allowGeometryUpdates: layerInfo?.allowGeometryUpdates,
        capabilities,
        hasUpdateCapability: capabilities.includes('Update')
      })

      return canUpdate && capabilities.includes('Update')
    }

    return false
  }

  // Gestion du changement de source de données
  onDataSourceChange = async (useDataSources: UseDataSource[]): Promise<void> => {
    if (!useDataSources || useDataSources.length === 0) {
      this.props.onSettingChange({
        id: this.props.id,
        useDataSources: [],
        config: this.props.config.set('useDataSource', [])
      })
      return
    }

    try {
      const formattedDataSources = useDataSources.map(ds => ({
        ...ds,
        fields: ['*'],
        useFieldsInPopupInfo: true,
        useFieldsInSymbol: false,
        enableEdit: true, // Forcé à true pour permettre l'édition
        enableCreate: false,
        enableDelete: false,
        isEditableDataSource: true, // indique que la source est éditable
        supportUpdateRecords: true, // active explicitement la mise à jour
        editableInfo: { // configuration détaillée de l'édition
          enableCreate: false,
          enableDelete: false,
          enableEdit: true,
          enableGeometryEdit: false
        }
      }))

      this.props.onSettingChange({
        id: this.props.id,
        useDataSources: formattedDataSources,
        config: this.props.config
          .set('useDataSource', formattedDataSources)
          .set('enableScore', true)
          .set('editingEnabled', true)
          .set('allowUpdates', true)
      })
    } catch (error) {
      console.error('Erreur lors de la configuration:', error)
      this.setState({ invalidDataSource: true })
    }
  }

  // Vérification de la validité de la source de données
  checkDataSourceValidity = async (useDataSource: UseDataSource) => {
    try {
      // On s'assure d'avoir une structure valide
      const validDataSource = {
        dataSourceId: useDataSource.dataSourceId,
        mainDataSourceId: useDataSource.mainDataSourceId,
        rootDataSourceId: useDataSource.rootDataSourceId
      }

      const dataSource = await DataSourceManager.getInstance().createDataSourceByUseDataSource(
        Immutable(validDataSource)
      )

      if (!dataSource) {
        this.setState({ invalidDataSource: true })
        return
      }

      const schema = dataSource.getSchema()
      if (!schema || !schema.fields) {
        this.setState({ invalidDataSource: true })
        return
      }

      this.setState({ invalidDataSource: false })
    } catch (err) {
      console.error('Erreur lors de la vérification de la source de données:', err)
      this.setState({ invalidDataSource: true })
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
                useDataSources={this.props.useDataSources || Immutable([])}
                onChange={this.onDataSourceChange}
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
                useDataSources={this.props.useDataSources}
                onChange={this.onDisplayFieldsChange}
                selectedFields={this.props.useDataSources[0].fields || Immutable([])}
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
                    this.props.onSettingChange({
                      id: this.props.id,
                      config: this.props.config.set('scoreField', selectedField?.name || '')
                    })
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
      </div>
    )
  }
}
