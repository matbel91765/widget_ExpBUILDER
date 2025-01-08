/** @jsx jsx */
import {
  React,
  jsx,
  DataSourceComponent,
  type AllWidgetProps,
  DataSourceManager,
  type DataSource,
  type DataRecord,
  ReactResizeDetector,
  type SqlQueryParams,
  type QueriableDataSource
} from 'jimu-core'

import { type IMConfig } from '../config'
import { Loading, Select } from 'jimu-ui'
import ListItem from './components/list-item'
import EmptyState from './components/empty-state'
import SearchBox from './components/search-box'
import '../style.css'

// Interface pour définir la structure de l'état du widget
interface State {
  dataSource: DataSource
  records: DataRecord[]
  isLoading: boolean
  error: string | null
  searchText: string
  selectedRecords: DataRecord[]
  containerWidth: number
  containerHeight: number
  selectedTag: string | null
  searchActive: boolean
  searchScores: { [key: string]: number }
  originalRecords: DataRecord[]
  selectedSource: string | null
  selectedCategory: string | null
  selectedProduct: string | null
  selectedLanguage: string | null
  loadingMore: boolean
  itemsToShow: number // Nombre d'éléments actuellement affichés
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  // Référence pour le conteneur principal du widget
  containerRef: React.RefObject<HTMLDivElement>

  editingPromise: Promise<boolean> | null = null
  isEditingInitialized = false

  constructor (props) {
    super(props)
    this.state = {
      dataSource: null,
      records: [],
      isLoading: true,
      error: null,
      searchText: '',
      selectedRecords: [],
      containerWidth: 0,
      containerHeight: 0,
      selectedTag: null,
      searchActive: false,
      searchScores: {},
      originalRecords: [],
      selectedSource: null,
      selectedCategory: null,
      selectedProduct: null,
      selectedLanguage: null,
      loadingMore: false,
      itemsToShow: 20 // Nombre initial d'éléments à afficher
    }
    this.containerRef = React.createRef()
  }

  queryParams: SqlQueryParams = {
    page: 1,
    pageSize: 19000,
    outFields: ['*'],
    where: '1=1',
    orderByFields: ['objectid ASC'],
    honorOutFields: true
  }

  // On l'appelle quand la source de donnée est crée
  onDataSourceCreated = async (ds: DataSource): Promise<void> => {
    try {
      console.log('1. Source créée:', {
        id: ds?.id,
        type: ds?.type,
        status: ds?.getStatus()
      })

      if (!('query' in ds)) {
        console.error('La source de données ne supporte pas les requêtes')
        this.setState({
          isLoading: false,
          error: 'Type de source de données non supporté'
        })
        return
      }

      // Mise à jour de l'état avec la source de données
      this.setState({
        dataSource: ds,
        isLoading: true
      })

      // On attend que la source soit prête
      await ds.ready()
      console.log('2. Source prête, statut:', ds.getStatus())

      // On  exécute la requête directement
      const sqlQuery: SqlQueryParams = {
        page: 1,
        pageSize: this.queryParams.pageSize,
        where: '1=1',
        outFields: ['*'],
        orderByFields: ['objectid ASC']
      }

      const queryRecords = await ((ds as QueriableDataSource).query)(sqlQuery)
      console.log('3. Résultats de la requête:', {
        success: !!queryRecords,
        recordCount: queryRecords?.records?.length
      })

      if (queryRecords?.records?.length > 0) {
        this.setState({
          records: queryRecords.records,
          originalRecords: queryRecords.records, // Sauvegarde des records originaux
          isLoading: false,
          error: null
        })
      } else {
        this.setState({
          records: [],
          isLoading: false,
          error: 'Aucune donnée trouvée'
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      this.setState({
        isLoading: false,
        error: 'Erreur lors du chargement de la source de données'
      })
    }
  }

  // Gestion des erreurs lors de la création de la source de données
  onCreateDataSourceFailed = (err: any): void => {
    this.setState({
      isLoading: false,
      error: 'Erreur lors de la création de la source de données'
    })
    console.error('Erreur de création de la source de données:', err)
  }

  // Chargement des enregistrements depuis la source de données
  loadRecords = async (ds: DataSource): Promise<void> => {
    try {
      console.log('Début du chargement des records')

      await ds.ready()
      console.log('Source de données prête')

      const sourceRecords = ds.getSourceRecords()
      let records = ds.getRecords()

      if (!records || records.length === 0) {
        records = sourceRecords
      }

      if (records && records.length > 0) {
        this.setState({
          records,
          originalRecords: records, // Maintenir les records originaux
          isLoading: false,
          error: null
        })
      } else {
        this.setState({
          records: [],
          originalRecords: [],
          isLoading: false,
          error: 'Aucune donnée trouvée dans la source de données'
        })
      }
    } catch (error) {
      console.error('Erreur détaillée lors du chargement:', error)
      this.setState({
        isLoading: false,
        error: `Erreur lors du chargement des données: ${error.message}`,
        records: [],
        originalRecords: []
      })
    }
  }

  async componentDidMount () {
    const { useDataSources } = this.props

    if (useDataSources?.[0]) {
      const ds = DataSourceManager.getInstance().getDataSource(useDataSources[0].dataSourceId)
      if (ds) {
        try {
          await ds.ready()

          // Explorer la structure de la source de données
          console.log('Informations détaillées de la source:', {
            type: ds.type,
            id: ds.id,
            url: (ds as any).url,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(ds)),
            layerInfo: (ds as any).layerDefinition,
            jimuSource: (ds as any).jimuChildDataSource,
            capabilities: (ds as any).getCapabilities?.()
          })
        } catch (error) {
          console.error('Erreur lors de l\'initialisation:', error)
        }
      }
    }
  }

  handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    const threshold = 100 // pixels avant la fin du scroll
    const { loadingMore, itemsToShow, records } = this.state

    // On vérifie aussi si on a déjà chargé toutes les données disponibles
    if (!loadingMore &&
        scrollHeight - scrollTop - clientHeight < threshold &&
        itemsToShow < records.length) { // Ajout de cette condition
      this.loadMoreItems()
    }
  }

  loadMoreItems = () => {
    // On vérifie d'abord si il y a encore des éléments à charger
    const { itemsToShow, records } = this.state
    const hasMoreItems = itemsToShow < records.length

    if (!hasMoreItems) return

    this.setState(prevState => ({
      loadingMore: true
    }), () => {
      setTimeout(() => {
        this.setState(prevState => ({
          itemsToShow: Math.min(prevState.itemsToShow + 20, records.length), // On limite au nombre total d'éléments
          loadingMore: false
        }))
      }, 500)
    })
  }

  getUniqueValues = (field: string): string[] => {
    const { originalRecords } = this.state
    const values = new Set<string>()

    originalRecords.forEach(record => {
      const value = record.getData()[field]
      if (value) values.add(value.toString())
    })

    return Array.from(values).sort()
  }

  handleFilterChange = (filterType: string, value: string) => {
    this.setState({
      [`selected${filterType}`]: value,
      itemsToShow: 20 // Réinitialise le nombre d'éléments affichés
    } as any)
  }

  // Fonctionnalités de recherche
  handleSearch = async (query: string) => {
    const { dataSource } = this.state
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      this.onDataSourceCreated(dataSource)
      return
    }

    try {
      let whereClause: string
      const fieldSearch = query.match(/^(\w+):(.*)$/)

      if (fieldSearch) {
        const [, field, value] = fieldSearch
        whereClause = this.buildWhereClause(field, value)
      } else {
        const searchableFields = ['title', 'description', 'summary', 'tags', 'category', 'product', 'source', 'lang']
        // On s'assure que la recherche trouve les variations de casse
        const searchTerms = trimmedQuery.toLowerCase().split(/\s+/).filter(term => term.length >= 2)

        const fieldClauses = searchableFields.map(field => {
          return searchTerms.map(term =>
            `LOWER(${field}) LIKE LOWER('%${term}%')`
          ).join(' AND ')
        }).filter(clause => clause !== '')

        whereClause = fieldClauses.join(' OR ')
      }

      console.log('Clause WHERE:', whereClause) // Pour debug

      const searchQuery: SqlQueryParams = {
        where: whereClause,
        outFields: ['*'],
        orderByFields: ['objectid ASC']
      }

      const searchResults = await (dataSource as QueriableDataSource).query(searchQuery)
      const records = searchResults?.records || []

      if (records.length > 0) {
        const searchScores = new Map<string, number>()
        const exactTitleMatches = new Set<string>()

        records.forEach(record => {
          const data = record.getData()
          let maxSimilarity = 0

          // Vérifier les correspondances exactes dans le titre
          if (data.title) {
            const titleLower = data.title.toString().toLowerCase()
            const queryLower = trimmedQuery.toLowerCase()

            if (titleLower.includes(queryLower)) {
              exactTitleMatches.add(record.getId())
              maxSimilarity = 100 // Score max pour les correspondances de titre
            }
          }

          // Calcul normal de similarité pour les autres champs
          Object.keys(data).forEach(field => {
            const fieldValue = data[field]
            if (fieldValue) {
              const similarity = this.calculateSimilarity(
                fieldValue.toString(),
                trimmedQuery
              )
              maxSimilarity = Math.max(maxSimilarity, similarity)
            }
          })

          searchScores.set(record.getId(), maxSimilarity)
        })

        // Tri personnalisé : d'abord les correspondances exactes de titre, puis par score
        const sortedRecords = records.sort((a, b) => {
          const aHasExactTitle = exactTitleMatches.has(a.getId())
          const bHasExactTitle = exactTitleMatches.has(b.getId())

          if (aHasExactTitle && !bHasExactTitle) return -1
          if (!aHasExactTitle && bHasExactTitle) return 1

          // Si même niveau de correspondance titre, trier par score
          return (searchScores.get(b.getId()) || 0) - (searchScores.get(a.getId()) || 0)
        })

        this.setState({
          records: sortedRecords,
          searchActive: true,
          searchScores: Object.fromEntries(searchScores),
          itemsToShow: 20
        })
      } else {
        this.setState({
          records: [],
          searchActive: true,
          searchScores: {},
          itemsToShow: 20
        })
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    }
  }

  private readonly buildWhereClause = (field: string, value: string): string => {
    const escapedValue = value.replace(/'/g, "''")
    return `LOWER(${field}) LIKE LOWER('%${escapedValue}%')`
  }

  //  fonction de calcul de similarité
  calculateSimilarity = (str1: string, str2: string): number => {
    str1 = str1.toLowerCase().trim()
    str2 = str2.toLowerCase().trim()

    // Correspondance exacte
    if (str1 === str2) return 100

    // Calcul basé sur l'inclusion des mots
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)

    // Pour les chaînes courtes (recherches simples)
    if (words2.length === 1) {
      // Correspondance exacte du mot
      if (words1.includes(str2)) return 100

      // Inclusion comme sous-chaîne
      if (str1.includes(str2)) return 85
      if (str2.includes(str1)) return 75

      // Pour les correspondances partielles, calculer un score proportionnel
      const bestWordMatch = words1.map(word => {
        const prefixMatch = word.startsWith(str2) ? 70 : 0
        const suffixMatch = word.endsWith(str2) ? 60 : 0
        const partialMatch = word.includes(str2) ? 50 : 0
        return Math.max(prefixMatch, suffixMatch, partialMatch)
      })

      const maxScore = Math.max(0, ...bestWordMatch)
      if (maxScore > 0) return maxScore
    }

    // Pour les chaînes plus longues, calculer un score basé sur les mots communs
    const commonWords = words1.filter(word =>
      words2.some(w2 => {
        // Correspondance exacte du mot
        if (word === w2) return true
        // Correspondance partielle forte
        if (word.includes(w2) || w2.includes(word)) return true
        // Correspondance floue basée sur la distance de Levenshtein
        return this.levenshteinDistance(word, w2) <= Math.min(2, Math.floor(word.length / 3))
      })
    )

    if (commonWords.length > 0) {
      // Score basé sur le ratio de mots communs
      const matchRatio = (commonWords.length * 2) / (words1.length + words2.length)
      return Math.round(matchRatio * 100)
    }

    // Si aucune correspondance significative n'est trouvée
    // Je propose d'utiliser la distance de Levenshtein
    // Source: "https://www.tutorialspoint.com/levenshtein-distance-in-javascript#:~:text=We%20are%20required%20to%20write%20a%20JavaScript%20function,0%3B%20j%20%3C%3D%20str2.length%3B%20j%20%2B%3D%201%29%20%7B"
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    const similarity = Math.max(0, 100 - (distance / maxLength * 100))

    // Ne retourner un score que si la similarité est significative
    return similarity > 40 ? Math.round(similarity) : 0
  }

  levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    )

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  handleScoreUpdate = async (recordId: string, increment: boolean): Promise<void> => {
    const { dataSource, records } = this.state
    const { scoreField } = this.props.config

    if (!dataSource || !scoreField) {
      throw new Error('Configuration invalide')
    }

    try {
      // S'assurer que la source est prête
      await dataSource.ready()

      // Récupérer l'enregistrement à mettre à jour
      const record = records.find(r => r.getId() === recordId)
      if (!record) {
        throw new Error('Enregistrement non trouvé')
      }

      const currentData = record.getData()
      const currentScore = currentData[scoreField] || 0
      const newScore = increment ? currentScore + 1 : Math.max(0, currentScore - 1)

      // Construire l'URL de mise à jour
      const serviceUrl = (dataSource as any).url
      const applyEditsUrl = `${serviceUrl}/applyEdits`

      // Construire l'objet de mise à jour
      const updateFeature = {
        attributes: {
          // Utiliser l'ID de l'objet pour la mise à jour
          objectid: recordId,
          [scoreField]: newScore
        }
      }

      // Préparer les paramètres de la requête
      const params = {
        f: 'json',
        updates: JSON.stringify([updateFeature])
      }

      // Convertir les paramètres en chaîne de requête
      const formData = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value)
      })

      // Effectuer la requête de mise à jour
      console.log('Envoi de la requête de mise à jour:', {
        url: applyEditsUrl,
        feature: updateFeature
      })

      const response = await fetch(applyEditsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('Résultat de la mise à jour:', result)

      // Vérifier si la mise à jour a réussi
      if (result.updateResults?.[0]?.success) {
        // Mise à jour réussie, mettre à jour l'état local
        const recordToUpdate = record.clone()
        recordToUpdate.setData({
          ...currentData,
          [scoreField]: newScore
        })

        this.setState(prevState => ({
          records: prevState.records.map(r =>
            r.getId() === recordId ? recordToUpdate : r
          ),
          originalRecords: prevState.originalRecords.map(r =>
            r.getId() === recordId ? recordToUpdate : r
          )
        }))

        console.log('Mise à jour réussie !')
      } else {
        // La mise à jour a échoué
        const error = result.updateResults?.[0]?.error || 'Erreur inconnue'
        throw new Error(`La mise à jour a échoué: ${error.description || error}`)
      }
    } catch (error) {
      console.error('Erreur détaillée lors de la mise à jour:', {
        error,
        serviceUrl: (dataSource as any).url,
        recordId,
        scoreField
      })
      throw error
    }
  }

  // Gestion du redimensionnement du conteneur
  handleResize = (width: number, height: number): void => {
    this.setState({
      containerWidth: width,
      containerHeight: height
    })
  }

  // Vérification de la configuration de la source de données
  isDsConfigured = (): boolean => {
    const { useDataSources } = this.props
    return !!useDataSources && useDataSources.length > 0
  }

  // Rendu du contenu principal du widget
  renderContent = (): JSX.Element => {
    const {
      records,
      isLoading,
      error,
      dataSource,
      searchActive,
      originalRecords,
      selectedSource,
      selectedCategory,
      selectedProduct,
      selectedLanguage
    } = this.state
    const { config } = this.props

    console.log('Rendu du contenu:', {
      recordCount: records?.length,
      isLoading,
      error,
      configStatus: this.isDsConfigured(),
      dataSourceStatus: dataSource?.getStatus()
    })

    if (isLoading) {
      return (
        <div className="loading-container d-flex align-items-center justify-content-center">
          <Loading className="mr-2" />
          <span>Chargement des données...</span>
        </div>
      )
    }

    if (error) {
      return <EmptyState message={error} type="error" />
    }

    if (!this.isDsConfigured()) {
      return <EmptyState message="Veuillez configurer une source de données" type="noConfig" />
    }

    if (!records || records.length === 0) {
      const status = dataSource?.getStatus() || 'status inconnu'
      return <EmptyState message={`Aucune donnée à afficher (${status})`} type="noData" />
    }

    // Vérification spécifique pour la recherche sans résultats
    if (searchActive && records.length === 0) {
      return <EmptyState
      message="Aucun résultat ne correspond à votre recherche"
      type="noSearchResults"
    />
    }

    // Vérification générale des données
    if (!originalRecords || originalRecords.length === 0) {
      return <EmptyState message="Aucune donnée disponible" type="noData" />
    }

    // Si nous avons des données mais aucun résultat filtré
    if (records.length === 0) {
      return <EmptyState
        message="Aucun élément ne correspond aux critères de filtrage"
        type="noSearchResults"
      />
    }

    // Filtrer les records selon les critères sélectionnés
    let filteredRecords = records

    if (selectedSource) {
      filteredRecords = filteredRecords.filter(record =>
        record.getData().source === selectedSource)
    }

    if (selectedCategory) {
      filteredRecords = filteredRecords.filter(record =>
        record.getData().category === selectedCategory)
    }

    if (selectedProduct) {
      filteredRecords = filteredRecords.filter(record =>
        record.getData().product === selectedProduct)
    }

    if (selectedLanguage) {
      filteredRecords = filteredRecords.filter(record =>
        record.getData().lang === selectedLanguage)
    }

    return (
    <div className="widget-content">
      {/* Barre de recherche */}
      <div className="search-container">
        <SearchBox
          onSearch={this.handleSearch}
          records={records}
          fields={Array.isArray(this.props.config.displayFields)
            ? this.props.config.displayFields
            : Array.from(this.props.config.displayFields)}
        />
      </div>

      <div className="main-content">
        {/* Filtres avec des Select */}
        <div className="filters-section">
          <Select
            placeholder="Source"
            onChange={(evt) => { this.handleFilterChange('Source', evt.target.value) }}
            value={selectedSource || ''}
            className="w-full"
          >
            <option value="">Toutes les sources</option>
            {this.getUniqueValues('source').map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </Select>

          <Select
            placeholder="Catégorie"
            onChange={(evt) => { this.handleFilterChange('Category', evt.target.value) }}
            value={selectedCategory || ''}
            className="w-full"
          >
            <option value="">Toutes les catégories</option>
            {this.getUniqueValues('category').map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>

          <Select
            placeholder="Produit"
            onChange={(evt) => { this.handleFilterChange('Product', evt.target.value) }}
            value={selectedProduct || ''}
            className="w-full"
          >
            <option value="">Tous les produits</option>
            {this.getUniqueValues('product').map(product => (
              <option key={product} value={product}>{product}</option>
            ))}
          </Select>

          <Select
            placeholder="Langue"
            onChange={(evt) => { this.handleFilterChange('Language', evt.target.value) }}
            value={selectedLanguage || ''}
            className="w-full"
          >
            <option value="">Toutes les langues</option>
            {this.getUniqueValues('lang').map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </Select>
        </div>

        {/* Section des résultats avec infinite scroll */}
        <div className="results-section">
          <div
            className="results-list"
            onScroll={this.handleScroll}
          >
            {filteredRecords.slice(0, this.state.itemsToShow).map(record => (
              <ListItem
                key={record.getId()}
                record={record}
                config={config}
                onScoreUpdate={this.handleScoreUpdate}
                searchScore={this.state.searchScores[record.getId()]}
                searchActive={searchActive}
              />
            ))}

            {this.state.loadingMore && (
              <div className="flex justify-center p-4">
                <Loading />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )
  }

  render (): JSX.Element {
    const { useDataSources } = this.props

    return (
      <div
        className="widget-enhanced-list jimu-widget h-100"
        ref={this.containerRef}
      >
        <ReactResizeDetector
          handleWidth
          handleHeight
          onResize={this.handleResize}
        >
          {useDataSources?.[0]
            ? (
            <DataSourceComponent
              useDataSource={useDataSources[0]}
              onDataSourceCreated={this.onDataSourceCreated}
              onCreateDataSourceFailed={this.onCreateDataSourceFailed}
              widgetId={this.props.id}
              query={this.queryParams}
            >
              {this.renderContent()}
            </DataSourceComponent>
              )
            : (
                this.renderContent()
              )}
        </ReactResizeDetector>
      </div>
    )
  }
}
