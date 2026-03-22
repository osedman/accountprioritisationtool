"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, ArrowUpDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FilterBarProps {
  industries: string[]
  selectedIndustries: string[]
  selectedTiers: string[]
  searchQuery: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onIndustryChange: (industries: string[]) => void
  onTierChange: (tiers: string[]) => void
  onSearchChange: (query: string) => void
  onSortChange: (sortBy: string) => void
  onSortOrderChange: (order: 'asc' | 'desc') => void
  onClearFilters: () => void
}

const PRIORITY_TIERS = ['critical', 'high', 'medium', 'low']

export function FilterBar({
  industries,
  selectedIndustries,
  selectedTiers,
  searchQuery,
  sortBy,
  sortOrder,
  onIndustryChange,
  onTierChange,
  onSearchChange,
  onSortChange,
  onSortOrderChange,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters = selectedIndustries.length > 0 || selectedTiers.length > 0 || searchQuery

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border">
              <Filter className="mr-2 h-4 w-4" />
              Industry
              {selectedIndustries.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedIndustries.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by Industry</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {industries.map((industry) => (
              <DropdownMenuCheckboxItem
                key={industry}
                checked={selectedIndustries.includes(industry)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onIndustryChange([...selectedIndustries, industry])
                  } else {
                    onIndustryChange(selectedIndustries.filter((i) => i !== industry))
                  }
                }}
              >
                {industry}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border">
              <Filter className="mr-2 h-4 w-4" />
              Priority
              {selectedTiers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedTiers.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRIORITY_TIERS.map((tier) => (
              <DropdownMenuCheckboxItem
                key={tier}
                checked={selectedTiers.includes(tier)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTierChange([...selectedTiers, tier])
                  } else {
                    onTierChange(selectedTiers.filter((t) => t !== tier))
                  }
                }}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px] border-border bg-input">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="renewal">Renewal</SelectItem>
            <SelectItem value="health">Health</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="border-border"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
