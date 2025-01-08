import React from 'react'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { SearchOutlined } from 'jimu-icons/outlined/editor/search'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import { Button } from 'jimu-ui'

interface EmptyStateProps {
  message?: string
  type?: 'noData' | 'noSearchResults' | 'error' | 'noConfig'
  action?: {
    label: string
    onClick: () => void
  }
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'Aucune donnée à afficher',
  type = 'noData',
  action
}) => {
  const renderIllustration = () => {
    const commonClasses = 'w-16 h-16 mb-6'

    switch (type) {
      case 'noSearchResults':
        return (
          <div className="empty-illustration">
            <SearchOutlined
              className={`${commonClasses} text-blue-500`}
              size={64}
            />
          </div>
        )
      case 'error':
        return (
          <div className="empty-illustration">
            <WarningOutlined
              className={`${commonClasses} text-red-500`}
              size={64}
            />
          </div>
        )
      case 'noConfig':
        return (
          <div className="empty-illustration">
            <InfoOutlined
              className={`${commonClasses} text-yellow-500`}
              size={64}
            />
          </div>
        )
      default:
        return (
          <div className="empty-illustration">
            <InfoOutlined
              className={`${commonClasses} text-gray-400`}
              size={64}
            />
          </div>
        )
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'noSearchResults':
        return 'Essayez de modifier vos termes de recherche ou vérifiez l\'orthographe'
      case 'error':
        return 'Une erreur est survenue lors du chargement des données'
      case 'noConfig':
        return 'Configurez une source de données pour commencer à utiliser ce widget'
      default:
        return 'Aucune donnée n\'est disponible pour le moment'
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50'
      case 'noConfig':
        return 'bg-yellow-50'
      case 'noSearchResults':
        return 'bg-blue-50'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center w-full h-full min-h-[400px] 
                     p-8 rounded-xl ${getBackgroundColor()} transition-all duration-300
                     animate-fadeIn`}>
      {renderIllustration()}

      <div className="text-center max-w-md">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {message}
        </h3>

        <p className="text-gray-600 mb-6">
          {getDescription()}
        </p>

        {action && (
          <Button
            className='inline-flex items-center px-4 py-2 bg-overlay border border-gray-300
                     text-sm font-medium rounded-2 text-gray-700 hover:bg-gray-50
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                     transition-colors duration-200'
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}

export default EmptyState
