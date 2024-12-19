import React, { useState } from 'react'
import { TextInput } from 'jimu-ui'

interface SearchBoxProps {
  onSearch: (query: string) => void
  records: any[]
  fields: string[] | Readonly<string[]>
}

export const SearchBox = ({ onSearch, records, fields }: SearchBoxProps) => {
  const [searchText, setSearchText] = useState('')

  // Gestion des changements dans la recherche avec mise à jour en temps réel
  const handleSearchChange = (evt) => {
    const newText = evt.target.value
    setSearchText(newText)
    // Déclenche la recherche immédiatement lors de la saisie
    onSearch(newText)
  }

  return (
    <div className="search-box-container w-full relative">
      <div className="relative">
        <TextInput
          className="w-full"
          placeholder="Rechercher... (utilisez field:value pour une recherche précise)"
          value={searchText}
          onChange={handleSearchChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onSearch(searchText)
            }
          }}
        />
      </div>
    </div>
  )
}

export default SearchBox
