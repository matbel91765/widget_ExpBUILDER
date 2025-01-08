import React from 'react'
import { Button } from 'jimu-ui'

interface FilterSectionProps {
  title: string
  items: string[]
  selectedItem: string | null
  onSelect: (item: string) => void
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  items,
  selectedItem,
  onSelect
}) => {
  return (
    <div className="filter-section mb-6">
      <h3 className="text-sm font-medium text-gray-600 mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <Button
            key={item}
            className={`
              w-full px-4 py-2 text-left justify-start rounded-lg
              ${selectedItem === item
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }
            `}
            onClick={() => { onSelect(item) }}
          >
            {item}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default FilterSection
