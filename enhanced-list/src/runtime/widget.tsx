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
import { Button, Loading } from 'jimu-ui'
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
  currentPage: number
  itemsPerPage: number
  selectedTag: string | null
  searchActive: boolean
  searchScores: { [key: string]: number }
  originalRecords: DataRecord[]
}

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  // Référence pour le conteneur principal du widget
  containerRef: React.RefObject<HTMLDivElement>

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
      currentPage: 1,
      itemsPerPage: 20,
      selectedTag: null,
      searchActive: false,
      searchScores: {},
      originalRecords: []
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

  componentDidMount () {
    console.log('componentDidMount - Début')
    const { useDataSources } = this.props
    console.log('useDataSources:', useDataSources)

    if (useDataSources?.[0]) {
      console.log('DataSource ID à charger:', useDataSources[0].dataSourceId)
      const ds = DataSourceManager.getInstance().getDataSource(useDataSources[0].dataSourceId)
      console.log('DataSource obtenue:', ds)

      if (ds) {
        console.log('État initial de la source:', {
          id: ds.id,
          status: ds.getStatus(),
          isQueriable: 'query' in ds
        })
      }
    }
  }

  // Fonctionnalités de recherche
  handleSearch = (query: string) => {
    const { originalRecords } = this.state
    const trimmedQuery = query.trim()

    if (!query.trim()) {
      this.setState({
        records: originalRecords,
        searchActive: false,
        searchScores: {},
        currentPage: 1
      })
      return
    }

    // Si la recherche est vide, réinitialiser
    if (!trimmedQuery) {
      this.setState({
        records: originalRecords,
        searchActive: false,
        searchScores: {},
        currentPage: 1
      })
      return
    }

    // Pour les requêtes très courtes (1 ou 2 caractères)
    if (trimmedQuery.length < 3) {
    // On cherche que les correspondances exactes ou début de mot
      const filteredRecords = originalRecords.filter(record => {
        const data = record.getData()
        return this.props.config.displayFields.some(field => {
          const value = data[field]
          if (!value) return false
          const strValue = value.toString().toLowerCase()
          // Vérification si la valeur commence par la requête
          return strValue.split(/\s+/).some(word => word.startsWith(trimmedQuery.toLowerCase()))
        })
      })

      this.setState({
        records: filteredRecords,
        searchActive: true,
        searchScores: Object.fromEntries(filteredRecords.map(r => [r.getId(), 70])),
        currentPage: 1
      })
      return
    }

    const searchScores = new Map<string, number>()
    const fieldSearch = query.match(/^(\w+):(.*)$/)

    let filteredRecords
    if (fieldSearch) {
      const [, field, value] = fieldSearch
      filteredRecords = originalRecords.filter(record => {
        const fieldValue = record.getData()[field]
        if (!fieldValue) return false

        const similarity = this.calculateSimilarity(
          fieldValue.toString(),
          value
        )
        if (similarity > 0) {
          searchScores.set(record.getId(), similarity)
          return true
        }
        return false
      })
    } else {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length >= 2)

      if (searchTerms.length === 0) {
        this.setState({
          records: [],
          searchActive: true,
          searchScores: {},
          currentPage: 1
        })
        return
      }

      filteredRecords = originalRecords.filter(record => {
        const data = record.getData()
        let maxSimilarity = 0

        this.props.config.displayFields.forEach(field => {
          const fieldValue = data[field]
          if (fieldValue) {
            const similarity = this.calculateSimilarity(
              fieldValue.toString(),
              query
            )
            maxSimilarity = Math.max(maxSimilarity, similarity)
          }
        })

        if (maxSimilarity > 0) {
          searchScores.set(record.getId(), maxSimilarity)
          return true
        }
        return false
      })
    }

    // Triage par score de pertinence
    filteredRecords.sort((a, b) => {
      const scoreA = searchScores.get(a.getId()) || 0
      const scoreB = searchScores.get(b.getId()) || 0
      return scoreB - scoreA
    })

    this.setState({
      records: filteredRecords,
      currentPage: 1,
      searchActive: true,
      searchScores: Object.fromEntries(searchScores)
    })
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

  // Mise à jour du score d'un enregistrement
  handleScoreUpdate = async (recordId: string, increment: boolean): Promise<void> => {
    const { dataSource, records } = this.state
    const { scoreField } = this.props.config

    if (!dataSource || !scoreField) return

    try {
      await dataSource.ready()

      // Trouve l'enregistrement à mettre à jour
      const record = records.find(r => r.getId() === recordId)
      if (!record) return

      const currentData = record.getData()
      const currentScore = currentData[scoreField] || 0
      const newScore = increment ? currentScore + 1 : currentScore - 1

      // Création d'un nouvel objet avec toutes les données
      const updatedData = {
        ...currentData,
        [scoreField]: newScore
      }

      try {
        // Mise à jour de l'enregistrement dans la source de données
        await dataSource.updateRecord(updatedData)

        // Mise à jour de l'état local
        const updatedRecords = records.map(r =>
          r.getId() === recordId
            ? { ...r, data: updatedData }
            : r
        )

        this.setState({
          records: updatedRecords,
          originalRecords: updatedRecords
        })
      } catch (error) {
        console.error('Erreur lors de la mise à jour du score:', error)
      }
    } catch (error) {
      console.error('Erreur lors de la préparation de la mise à jour:', error)
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
      currentPage,
      itemsPerPage,
      selectedTag,
      searchActive,
      originalRecords
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

    // Filtrer les records par tag si nécessaire
    const filteredRecords = selectedTag
      ? records.filter(record => {
        const data = record.getData()
        return data.tags && data.tags.toLowerCase().includes(selectedTag.toLowerCase())
      })
      : records

    // Pagination
    const totalRecords = filteredRecords.length
    const totalPages = Math.ceil(totalRecords / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage)

    // Récupérer tous les tags uniques
    const allTags = new Set<string>()
    records.forEach(record => {
      const data = record.getData()
      if (data.tags) {
        data.tags.split(',').forEach(tag => {
          allTags.add(tag.trim())
        })
      }
    })

    return (
      <div className="widget-content h-100 d-flex flex-column">
        {/* Barre de recherche */}
        <div className="search-container p-3 border-bottom">
          <SearchBox
            onSearch={this.handleSearch}
            records={records}
            fields={Array.isArray(this.props.config.displayFields)
              ? this.props.config.displayFields
              : Array.from(this.props.config.displayFields)}
          />
        </div>
        {/* Filtre de tags */}
        <div className="tag-filter p-3 border-bottom">
          <div className="d-flex flex-wrap gap-2">
            {Array.from(allTags).map(tag => (
              <Button
                key={tag}
                type={selectedTag === tag ? 'primary' : 'default'}
                className="tag-button"
                onClick={() => { this.setState({ selectedTag: selectedTag === tag ? null : tag, currentPage: 1 }) }}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Liste avec scroll */}
        <div className="list-container flex-grow-1 overflow-auto p-3">
          <div className="list-content">
            {paginatedRecords.map(record => (
              <ListItem
                key={record.getId()}
                record={record}
                config={config}
                onScoreUpdate={this.handleScoreUpdate}
                searchScore={this.state.searchScores[record.getId()]}
                searchActive={this.state.searchActive}
              />
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="pagination-controls p-3 border-top d-flex justify-content-between align-items-center">
          <span>
            Affichage {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalRecords)} sur {totalRecords}
          </span>
          <div className="d-flex gap-2">
            <Button
              disabled={currentPage === 1}
              onClick={() => { this.setState({ currentPage: currentPage - 1 }) }}
            >
              Précédent
            </Button>
            <span className="mx-3">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              disabled={currentPage === totalPages}
              onClick={() => { this.setState({ currentPage: currentPage + 1 }) }}
            >
              Suivant
            </Button>
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
