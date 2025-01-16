import { React, type DataRecord } from 'jimu-core'
import { Card, CardBody, Button, Tooltip } from 'jimu-ui'
import { type IMConfig } from '../../config'
import { MinusOutlined } from 'jimu-icons/outlined/editor/minus'
import { PlusOutlined } from 'jimu-icons/outlined/editor/plus'

interface ListItemProps {
  record: DataRecord
  config: IMConfig
  onScoreUpdate: (recordId: string, increment: boolean) => void
  searchScore?: number
  searchActive?: boolean
  hasVoted: boolean
}

const ListItem: React.FC<ListItemProps> = ({ record, config, onScoreUpdate, searchScore, searchActive, hasVoted }) => {
  const data = record.getData()
  const currentScore = data[config.scoreField] || 0
  const tags = data.tags ? data.tags.split(',').filter(tag => tag.trim() !== '') : []

  // Création de styles conditionnels pour les boutons
  const buttonBaseStyle = 'score-button rounded-full p-1'
  const buttonDisabledStyle = hasVoted ? 'bg-gray-200 cursor-not-allowed opacity-50' : 'hover:bg-gray-200'
  const buttonStyle = `${buttonBaseStyle} ${buttonDisabledStyle}`

  return (
    <Card
      className='list-item transform transition-all duration-200 hover:-translate-y-1 hover:shadow-3 cursor-pointer'
      onClick={() => data.url && window.open(data.url, '_blank')}
    >
      <CardBody className="p-6">
        {/* Header avec titre et score */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              {/* Titre et métadonnées */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {data.title || 'Sans titre'}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {data.summary || data.description || 'Aucune description disponible'}
                </p>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-sm text-gray-500"
                      >
                        {tag.trim()}{index < tags.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Zone de score */}
              <div className="flex items-center gap-3 ml-4">
                {searchActive && searchScore !== undefined && (
                  <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    {Math.round(searchScore)}%
                  </div>
                )}

                {config.enableScore && (
                  <div className='score-controls flex items-center bg-gray-50 rounded-full px-2 py-1'>
                    <Tooltip title={hasVoted ? 'Vous avez déjà voté' : 'Diminuer le score'} placement="top">
                      <span>
                        <Button
                          size="sm"
                          icon
                          className={buttonStyle}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!hasVoted) {
                              onScoreUpdate(record.getId(), false)
                            }
                          }}
                          disabled={hasVoted}
                        >
                          <MinusOutlined
                            size={16}
                            className={hasVoted ? 'text-gray-400' : 'text-gray-700'}
                          />
                        </Button>
                      </span>
                    </Tooltip>

                    <span className="mx-3 font-medium text-gray-700">
                      {currentScore}
                    </span>

                    <Tooltip title={hasVoted ? 'Vous avez déjà voté' : 'Augmenter le score'} placement="top">
                      <span>
                        <Button
                          size="sm"
                          icon
                          className={buttonStyle}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!hasVoted) {
                              onScoreUpdate(record.getId(), true)
                            }
                          }}
                          disabled={hasVoted}
                        >
                          <PlusOutlined
                            size={16}
                            className={hasVoted ? 'text-gray-400' : 'text-gray-700'}
                          />
                        </Button>
                      </span>
                    </Tooltip>

                    {hasVoted && (
                      <span className="ml-2 text-xs text-gray-500">
                        ✓ Voté
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default ListItem
