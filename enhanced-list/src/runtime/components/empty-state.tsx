import React from 'react'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { SearchOutlined } from 'jimu-icons/outlined/editor/search'

const EmptyState = ({ message = 'Aucune donnée à afficher', type = 'noData' }) => {
  // Différents styles selon le type d'état vide
  const getIllustration = () => {
    switch (type) {
      case 'noData':
        return (
          <div className="empty-illustration">
            <InfoOutlined
              size={48}
              className="text-primary mb-4"
            />
          </div>
        )
      case 'noSearchResults':
        return (
          <div className="empty-illustration">
            <SearchOutlined
              size={48}
              className="text-primary mb-4"
            />
          </div>
        )
      case 'error':
        return (
          <div className="empty-illustration text-danger">
            <svg
              className="w-32 h-32"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"/>
              <path d="M12 14a1 1 0 0 1-1-1V7a1 1 0 1 1 2 0v6a1 1 0 0 1-1 1zm-1.5 2.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"/>
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'noSearchResults':
        return 'Essayez de modifier vos termes de recherche ou de vérifier l\'orthographe.'
      case 'noData':
        return 'Configurez une source de données pour commencer à utiliser ce widget.'
      default:
        return ''
    }
  }

  return (
    <div className='flex flex-col items-center justify-center w-full h-full min-h-[200px] p-8 text-center bg-overlay rounded-2 shadow-1'>
      {getIllustration()}
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-medium text-gray-900">
          {message}
        </h3>
        <p className="text-sm text-gray-500">
          {getDescription()}
        </p>
      </div>
    </div>
  )
}

export default EmptyState
