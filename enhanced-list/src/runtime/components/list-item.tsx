import { React, type DataRecord } from 'jimu-core'
import { Card, CardBody, Button } from 'jimu-ui'
import { type IMConfig } from '../../config'
import { MinusOutlined } from 'jimu-icons/outlined/editor/minus'
import { PlusOutlined } from 'jimu-icons/outlined/editor/plus'

interface ListItemProps {
  record: DataRecord
  config: IMConfig
  onScoreUpdate: (recordId: string, increment: boolean) => void
  searchScore?: number // prop pour le score de recherche
  searchActive?: boolean // Pour savoir si une recherche est active
}

const ListItem: React.FC<ListItemProps> = ({ record, config, onScoreUpdate, searchScore, searchActive }) => {
  const data = record.getData()
  const currentScore = data[config.scoreField] || 0

  // On vérifie ici si les tags sont valides
  const tags = data.tags ? data.tags.split(',').filter(tag => tag.trim() !== '') : []

  return (
    <Card className='list-item mb-2 hover:shadow-3 transition-shadow duration-200'>
      <CardBody className="p-4">
        {/* En-tête avec score et score de recherche */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-primary mb-0">
                {data.title || 'Sans titre'}
              </h3>
              {searchActive && searchScore !== undefined && (
                <span className='text-sm text-success bg-success-100 px-2 py-1 rounded-1'>
                  {Math.round(searchScore)}% de pertinence
                </span>
              )}
            </div>
          </div>
          {config.enableScore && (
            <div className='score-controls d-flex align-items-center bg-paper rounded-pill px-3 py-2'>
              <Button
                size="sm"
                icon
                className="score-button"
                onClick={() => { onScoreUpdate(record.getId(), false) }}
              >
                <MinusOutlined size={16} />
              </Button>
              <span className="mx-3 font-weight-bold">
                {currentScore}
              </span>
              <Button
                size="sm"
                icon
                className="score-button"
                onClick={() => { onScoreUpdate(record.getId(), true) }}
              >
                <PlusOutlined size={16} />
              </Button>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-3">
          {data.summary || 'Aucun résumé'}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {data.category && data.category.trim() && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {data.category}
            </span>
          )}
          {tags.map((tag, index) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200"
            >
              {tag.trim()}
            </span>
          ))}
        </div>

        {data.url && (
          <Button
            type="primary"
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation()
              window.open(data.url, '_blank')
            }}
          >
            Voir plus
          </Button>
        )}
      </CardBody>
    </Card>
  )
}

export default ListItem
