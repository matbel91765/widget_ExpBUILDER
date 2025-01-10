/** @jsx jsx */
import {
  React,
  jsx,
  DataSourceComponent,
  type AllWidgetProps,
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
  currentPage: number
  hasMoreItems: boolean
  isLoadingMore: boolean
  searchActive: boolean
  searchScores: { [key: string]: number }
  originalRecords: DataRecord[]
  selectedSource: string | null
  selectedCategory: string | null
  selectedProduct: string | null
  selectedLanguage: string | null
  loadingMore: boolean
  votesDataSource: DataSource | null
  userVotes: Set<string>
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
      selectedTag: null,
      currentPage: 1,
      hasMoreItems: true,
      isLoadingMore: false,
      searchActive: false,
      searchScores: {},
      originalRecords: [],
      selectedSource: null,
      selectedCategory: null,
      selectedProduct: null,
      selectedLanguage: null,
      loadingMore: false,
      votesDataSource: null,
      userVotes: new Set<string>()
    }
    this.containerRef = React.createRef()
  }

  queryParams: SqlQueryParams = {
    page: 1,
    pageSize: 50,
    outFields: ['*'],
    where: '1=1',
    orderByFields: ['score DESC'],
    honorOutFields: true
  }

  // On l'appelle quand la source de donnée est crée
  onDataSourceCreated = async (ds: DataSource): Promise<void> => {
    try {
      if (!('query' in ds)) {
        console.error('La source de données ne supporte pas les requêtes')
        this.setState({
          isLoading: false,
          error: 'Type de source de données non supporté'
        })
        return
      }

      // Si c'est la source principale
      if (ds.id === this.props.config.mainDataSource?.[0]?.dataSourceId) {
        this.setState({
          dataSource: ds,
          isLoading: true
        })

        await ds.ready()
        await this.loadPage(1)
      } else if (ds.id === this.props.config.votesDataSourceId) {
        await ds.ready()
        this.setState({
          votesDataSource: ds
        }, () => {
          // Chargement des votes après la mise à jour de l'état
          this.loadUserVotes()
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

  // Fonction de chargement d'une page spécifique
  loadPage = async (page: number): Promise<void> => {
    const { dataSource } = this.state

    if (!dataSource) return

    try {
      const sqlQuery: SqlQueryParams = {
        ...this.queryParams,
        page,
        pageSize: this.queryParams.pageSize
      }

      const queryRecords = await ((dataSource as QueriableDataSource).query)(sqlQuery)

      const newRecords = queryRecords?.records || []

      this.setState(prevState => ({
        records: page === 1 ? newRecords : [...prevState.records, ...newRecords],
        originalRecords: page === 1 ? newRecords : [...prevState.originalRecords, ...newRecords],
        currentPage: page,
        hasMoreItems: newRecords.length === this.queryParams.pageSize,
        isLoading: false,
        isLoadingMore: false,
        error: null
      }))
    } catch (error) {
      console.error('Erreur lors du chargement de la page:', error)
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        error: 'Erreur lors du chargement des données'
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

  // Fonction pour le chargement des données lors du scroll de la liste
  handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    const threshold = 100 // pixels avant la fin du scroll
    const { isLoadingMore, hasMoreItems } = this.state

    if (!isLoadingMore &&
        hasMoreItems &&
        scrollHeight - scrollTop - clientHeight < threshold) {
      this.loadNextPage()
    }
  }

  // Fonction pour charger la page suivante
  loadNextPage = () => {
    const { currentPage, isLoadingMore } = this.state

    if (isLoadingMore) return

    this.setState({ isLoadingMore: true }, () => {
      this.loadPage(currentPage + 1)
    })
  }

  //  Fonction pour éviter les doublons dans la liste
  getUniqueValues = (field: string): string[] => {
    const { originalRecords } = this.state
    const values = new Set<string>()

    originalRecords.forEach(record => {
      const value = record.getData()[field]
      if (value) values.add(value.toString())
    })

    return Array.from(values).sort()
  }

  // Fonction pour les filtres
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
          searchScores: Object.fromEntries(searchScores)
        })
      } else {
        this.setState({
          records: [],
          searchActive: true,
          searchScores: {}
        })
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    }
  }

  // Fonction pour rendre la recherche insensible à la casse
  buildWhereClause = (field: string, value: string): string => {
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

  // Fonction de Levenshtein
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

  // Fonction pour mettre à jour le score
  handleScoreUpdate = async (recordId: string, increment: boolean): Promise<void> => {
    const { dataSource, records, votesDataSource } = this.state
    const { scoreField, votesDataSourceId } = this.props.config
    const currentUser = this.props.user?.username

    /*
    console.log('État des sources de données:', {
      mainDS: {
        ready: !!dataSource?.ready,
        status: dataSource?.getStatus(),
        url: (dataSource as any)?.url
      },
      votesDS: {
        ready: !!votesDataSource?.ready,
        status: votesDataSource?.getStatus(),
        url: (votesDataSource as any)?.url
      },
      config: {
        scoreField,
        votesDataSourceId: this.props.config.votesDataSourceId
      }
    })
    */

    if (!dataSource || !scoreField || !currentUser) {
      console.log('Vérification initiale:', {
        dataSource: !!dataSource,
        scoreField,
        currentUser,
        votesDataSourceId
      })
      throw new Error('Configuration invalide ou utilisateur non connecté')
    }

    try {
      await dataSource.ready()

      // Vérification détaillée de la source des votes
      if (!votesDataSource) {
        console.error('Source des votes non disponible:', {
          stateVotesDS: !!votesDataSource,
          configVotesDS: !!this.props.config.votesDataSource,
          votesDataSourceId
        })
        throw new Error('Source des votes non configurée')
      }

      await votesDataSource.ready()
      /*
      console.log('Source des votes prête:', {
        id: votesDataSource.id,
        status: votesDataSource.getStatus()
      })
      */

      const hasVoted = await this.checkUserVote(votesDataSource, recordId, currentUser)
      // console.log('Vérification du vote:', { hasVoted, recordId, currentUser })

      if (hasVoted) {
        console.log('Vote déjà existant pour:', { recordId, currentUser })
        return
      }

      const record = records.find(r => r.getId() === recordId)
      if (!record) {
        console.log('Record non trouvé:', { recordId })
        throw new Error('Enregistrement non trouvé')
      }

      const currentData = record.getData()
      const currentScore = currentData[scoreField] || 0
      const newScore = increment ? currentScore + 1 : Math.max(0, currentScore - 1)

      const serviceUrl = (dataSource as any).url
      const applyEditsUrl = `${serviceUrl}/applyEdits`

      const updateFeature = {
        attributes: {
          objectid: recordId,
          [scoreField]: newScore
        }
      }

      /*
      console.log('Tentative de mise à jour du score:', {
        recordId,
        currentScore,
        newScore,
        updateFeature,
        url: applyEditsUrl
      })
      */

      // Mise à jour du score
      const response = await fetch(applyEditsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          f: 'json',
          updates: JSON.stringify([updateFeature])
        })
      })
      console.log('Réponse de la mise à jour:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        console.error('Erreur de réponse HTTP:', response.status)
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()
      console.log('Résultat de la mise à jour:', result)

      if (result.updateResults?.[0]?.success) {
        // console.log('Mise à jour du score réussie, tentative d\'ajout du vote')

        if (votesDataSource) {
          try {
            // Vérifier si la source est prête
            await votesDataSource.ready()

            // Construction du feature avec les champs requis
            const voteFeature = {
              attributes: {
                objectid: null,
                elementid: String(recordId),
                userid: String(currentUser),
                datevote: new Date().getTime()
              }
            }

            // Préparation des paramètres de la requête
            const parameters = new URLSearchParams({
              f: 'json',
              adds: JSON.stringify([voteFeature]),
              rollbackOnFailure: 'true' // Important pour la gestion des erreurs
            })

            // Envoi de la requête
            const voteResponse = await fetch(`${(votesDataSource as any).url}/applyEdits`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: parameters
            })

            if (!voteResponse.ok) {
              throw new Error(`Erreur HTTP: ${voteResponse.status}`)
            }

            const voteResult = await voteResponse.json()
            // console.log('Résultat complet de l\'ajout du vote:', voteResult)

            if (voteResult.addResults?.[0]?.success) {
              // Succès - mise à jour de l'interface
              this.setState(prevState => ({
                userVotes: new Set([...prevState.userVotes, recordId])
              }))
            } else {
              // Échec - log détaillé et lancement d'erreur
              const error = voteResult.addResults?.[0]?.error
              console.error('Détails de l\'erreur:', {
                error,
                result: voteResult,
                feature: voteFeature
              })
              throw new Error(error?.description || 'Erreur inconnue lors de l\'ajout du vote')
            }
          } catch (error) {
            console.error('Erreur lors de l\'ajout du vote:', error)
            throw error
          }
        } else {
          console.warn('Source de données des votes non disponible')
        }
      } else {
        console.error('Échec de la mise à jour du score:', result)
        const error = result.updateResults?.[0]?.error || 'Erreur inconnue'
        throw new Error(`La mise à jour a échoué: ${error.description || error}`)
      }
    } catch (error) {
      console.error('Erreur détaillée lors de la mise à jour:', {
        error,
        dataSourceUrl: (dataSource as any).url,
        votesDataSourceUrl: (votesDataSource as any)?.url,
        recordId,
        scoreField
      })
      throw error
    }
  }

  loadUserVotes = async () => {
    const { votesDataSource } = this.state
    const currentUser = this.props.user?.username

    if (!votesDataSource || !currentUser) {
      console.log('Impossible de charger les votes:', {
        hasVotesDS: !!votesDataSource,
        hasUser: !!currentUser
      })
      return
    }

    try {
      const queryParams = {
        where: `userid = '${currentUser.toLowerCase()}'`,
        outFields: 'elementid',
        f: 'json'
      }

      const response = await fetch(
          `${(votesDataSource as any).url}/query?${new URLSearchParams(queryParams)}`
      )

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.features) {
        const votes = new Set<string>(
          result.features.map((f: any) => String(f.attributes.elementid))
        )

        console.log(`${votes.size} votes chargés pour l'utilisateur ${currentUser}`)

        this.setState({ userVotes: votes })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des votes:', error)
    }
  }

  // Fonction auxiliaire pour vérifier si l'utilisateur a déjà voté
  async checkUserVote (
    votesDataSource: DataSource | null,
    elementId: string,
    username: string | undefined
  ): Promise<boolean> {
    if (!votesDataSource || !username) {
      return false
    }

    try {
      // Conversion des paramètres pour respecter le type Record<string, string>
      const queryParams = {
        where: `ElementID = '${elementId}' AND UserID = '${username}'`,
        returnCountOnly: 'true', // Optimisation on retourne uniquement le nombre de résultat (si > 0 c'est que l'utilisateur a déjà voté sinon il n'a pas encore voté)
        f: 'json'
      }

      const response = await fetch(`${(votesDataSource as any).url}/query?${new URLSearchParams(queryParams)}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification du vote')
      }

      const result = await response.json()
      return result.count > 0
    } catch (error) {
      console.error('Erreur lors de la vérification du vote:', error)
      return false
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

  // Méthode Helper qui gère l'affichage du contenu interne du widget (état de chargement, erreur, filtrage, filtres, liste des résultats)
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

    /*
    console.log('Rendu du contenu:', {
      recordCount: records?.length,
      isLoading,
      error,
      configStatus: this.isDsConfigured(),
      dataSourceStatus: dataSource?.getStatus()
    })
    */

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
            {filteredRecords.map(record => (
              <ListItem
                key={record.getId()}
                record={record}
                config={config}
                onScoreUpdate={this.handleScoreUpdate}
                searchScore={this.state.searchScores[record.getId()]}
                searchActive={searchActive}
                hasVoted={this.state.userVotes.has(record.getId())}
              />
            ))}

            {this.state.isLoadingMore && (
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

  // Méthode principale qui gère la structure globale du widget et la mise en place des DatSourceComponent
  render (): JSX.Element {
    // Récupération des props nécessaires
    const { useDataSources, config } = this.props

    // Extraction des sources de données
    const mainDataSource = useDataSources?.[0]
    const votesDataSource = config.votesDataSource?.[0]

    // Construction du contenu du widget
    const content = mainDataSource
      ? (
      <DataSourceComponent
        useDataSource={mainDataSource}
        onDataSourceCreated={this.onDataSourceCreated}
        onCreateDataSourceFailed={this.onCreateDataSourceFailed}
        widgetId={this.props.id}
        query={this.queryParams}
      >
        {votesDataSource
          ? (
          <DataSourceComponent
            useDataSource={votesDataSource}
            onDataSourceCreated={(ds) => {
              console.log('Source des votes créée:', ds)
              this.setState({ votesDataSource: ds })
            }}
            onCreateDataSourceFailed={(err) => {
              console.error('Erreur création source votes:', err)
            }}
            widgetId={this.props.id}
          >
            {this.renderContent()}
          </DataSourceComponent>
            )
          : (
              this.renderContent()
            )}
      </DataSourceComponent>
        )
      : (
          this.renderContent()
        )

    // Rendu final avec le détecteur de redimensionnement
    return (
      <div className="widget-enhanced-list jimu-widget h-100" ref={this.containerRef}>
        <ReactResizeDetector handleWidth handleHeight onResize={this.handleResize}>
          {content}
        </ReactResizeDetector>
      </div>
    )
  }
}
