import React, { useRef, useState } from 'react'
import { TextInput } from 'jimu-ui'
import { SearchOutlined } from 'jimu-icons/outlined/editor/search'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'

interface SearchBoxProps {
  onSearch: (query: string) => void
  records: any[]
  fields: string[] | Readonly<string[]>
}

export const SearchBox = ({ onSearch, records, fields }: SearchBoxProps) => {
  const [searchText, setSearchText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Effacer la recherche
  const handleClear = () => {
    setSearchText('')
    onSearch('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Gestion des changements dans la recherche avec mise à jour en temps réel
  const handleSearchChange = (evt) => {
    const newText = evt.target.value
    setSearchText(newText)
    onSearch(newText)
  }

  return (
    <TextInput
      ref={inputRef}
      prefix={<SearchOutlined className="text-gray-400" size={16} />}
      className="search-input"
      placeholder="Rechercher..."
      value={searchText}
      onChange={handleSearchChange}
      suffix={
        searchText && (
          <CloseOutlined
            className="text-gray-400 cursor-pointer hover:text-gray-600"
            size={16}
            onClick={handleClear}
          />
        )
      }
    />
  )
}

export default SearchBox
