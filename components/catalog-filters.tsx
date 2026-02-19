// ============================================================
// Componente de Filtros para el Catálogo
// MTG Automotora - Diseño Minimalista
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  X, 
  Search, 
  Filter, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleFilters } from '@/types/vehicle';
import { REGIONES_CHILE } from '@/hooks/use-catalog-filters';
import { formatPriceCLP } from '@/lib/api/catalog';

interface CatalogFiltersProps {
  filters: VehicleFilters;
  onFilterChange: (filters: Partial<VehicleFilters>) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  availableBrands?: string[];
  availableModels?: string[];
  className?: string;
}

// Años disponibles (rango dinámico)
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => currentYear - i);

// Rangos de precio predefinidos
const PRICE_RANGES = [
  { label: 'Cualquier precio', min: undefined, max: undefined },
  { label: 'Hasta $5.000.000', min: 0, max: 5000000 },
  { label: '$5.000.000 - $10.000.000', min: 5000000, max: 10000000 },
  { label: '$10.000.000 - $15.000.000', min: 10000000, max: 15000000 },
  { label: '$15.000.000 - $20.000.000', min: 15000000, max: 20000000 },
  { label: '$20.000.000 - $30.000.000', min: 20000000, max: 30000000 },
  { label: 'Más de $30.000.000', min: 30000000, max: undefined },
];

// Rangos de kilometraje predefinidos
const MILEAGE_RANGES = [
  { label: 'Cualquier kilometraje', min: undefined, max: undefined },
  { label: 'Hasta 30.000 km', min: 0, max: 30000 },
  { label: '30.000 - 50.000 km', min: 30000, max: 50000 },
  { label: '50.000 - 80.000 km', min: 50000, max: 80000 },
  { label: '80.000 - 100.000 km', min: 80000, max: 100000 },
  { label: '100.000 - 150.000 km', min: 100000, max: 150000 },
  { label: 'Más de 150.000 km', min: 150000, max: undefined },
];

/**
 * Componente de filtros responsive para el catálogo
 * Mobile-first: Sheet en móvil, Sidebar en desktop
 */
export function CatalogFilters({
  filters,
  onFilterChange,
  onClearFilters,
  activeFiltersCount,
  availableBrands = [],
  availableModels = [],
  className
}: CatalogFiltersProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    brand: true,
    price: true,
    mileage: false,
    year: false,
    location: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Manejar cambio de marca
  const handleBrandChange = (value: string) => {
    if (value === 'all') {
      onFilterChange({ brand: [] });
    } else {
      onFilterChange({ brand: [value] });
    }
  };

  // Manejar cambio de región
  const handleRegionChange = (value: string) => {
    if (value === 'all') {
      onFilterChange({ region: undefined });
    } else {
      onFilterChange({ region: value });
    }
  };

  // Manejar cambio de rango de precio
  const handlePriceRangeChange = (index: number) => {
    const range = PRICE_RANGES[index];
    onFilterChange({
      price_min: range.min,
      price_max: range.max,
    });
  };

  // Manejar cambio de rango de kilometraje
  const handleMileageRangeChange = (index: number) => {
    const range = MILEAGE_RANGES[index];
    onFilterChange({
      mileage_min: range.min,
      mileage_max: range.max,
    });
  };

  // Manejar cambio de año
  const handleYearMinChange = (value: string) => {
    const year = value === 'all' ? undefined : parseInt(value);
    onFilterChange({ year_min: year });
  };

  const handleYearMaxChange = (value: string) => {
    const year = value === 'all' ? undefined : parseInt(value);
    onFilterChange({ year_max: year });
  };

  // Obtener label de precio seleccionado
  const getSelectedPriceLabel = () => {
    const index = PRICE_RANGES.findIndex(
      r => r.min === filters.price_min && r.max === filters.price_max
    );
    return index >= 0 ? PRICE_RANGES[index].label : 'Cualquier precio';
  };

  // Renderizar contenido del filtro
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Búsqueda por texto */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('search')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Búsqueda</span>
          {expandedSections.search ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.search && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              className="pl-9"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Marca */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('brand')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Marca</span>
          {expandedSections.brand ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.brand && (
          <Select 
            value={filters.brand?.[0] || 'all'} 
            onValueChange={handleBrandChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {availableBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator />

      {/* Precio */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Precio</span>
          {expandedSections.price ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.price && (
          <div className="space-y-3">
            <Select 
              value={PRICE_RANGES.findIndex(
                r => r.min === filters.price_min && r.max === filters.price_max
              ).toString()} 
              onValueChange={(v) => handlePriceRangeChange(parseInt(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cualquier precio" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((range, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rango manual con slider */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filters.price_min ? formatPriceCLP(filters.price_min) : 'Min'}</span>
                <span>{filters.price_max ? formatPriceCLP(filters.price_max) : 'Max'}</span>
              </div>
              <Slider
                defaultValue={[0, 100]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(values) => {
                  const min = values[0] === 0 ? undefined : values[0] * 500000;
                  const max = values[1] === 100 ? undefined : values[1] * 500000;
                  onFilterChange({ price_min: min, price_max: max });
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Kilometraje */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('mileage')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Kilometraje</span>
          {expandedSections.mileage ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.mileage && (
          <Select 
            value={MILEAGE_RANGES.findIndex(
              r => r.min === filters.mileage_min && r.max === filters.mileage_max
            ).toString()} 
            onValueChange={(v) => handleMileageRangeChange(parseInt(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cualquier kilometraje" />
            </SelectTrigger>
            <SelectContent>
              {MILEAGE_RANGES.map((range, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator />

      {/* Año */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('year')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Año</span>
          {expandedSections.year ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.year && (
          <div className="grid grid-cols-2 gap-2">
            <Select 
              value={filters.year_min?.toString() || 'all'} 
              onValueChange={handleYearMinChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Desde" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Desde</SelectItem>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={`min-${year}`} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.year_max?.toString() || 'all'} 
              onValueChange={handleYearMaxChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hasta</SelectItem>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={`max-${year}`} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      {/* Ubicación */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('location')}
          className="flex items-center justify-between w-full text-sm font-medium"
        >
          <span>Ubicación</span>
          {expandedSections.location ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.location && (
          <Select 
            value={filters.region || 'all'} 
            onValueChange={handleRegionChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas las regiones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {REGIONES_CHILE.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Botón limpiar filtros */}
      {activeFiltersCount > 0 && (
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar filtros ({activeFiltersCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-auto h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-semibold tracking-tight">
                Filtrar vehículos
              </SheetTitle>
            </SheetHeader>
            <FilterContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div className={cn("hidden lg:block", className)}>
        <Card className="sticky top-20 border-input shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilterContent />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/**
 * Componente de filtros activos (badges)
 */
export function ActiveFilters({
  filters,
  onRemoveFilter,
  onClearFilters,
  className
}: {
  filters: VehicleFilters;
  onRemoveFilter: (key: keyof VehicleFilters) => void;
  onClearFilters: () => void;
  className?: string;
}) {
  const activeFilters: { key: keyof VehicleFilters; label: string }[] = [];

  if (filters.brand?.length) {
    activeFilters.push({ key: 'brand', label: `Marca: ${filters.brand.join(', ')}` });
  }
  if (filters.region) {
    activeFilters.push({ key: 'region', label: `Región: ${filters.region}` });
  }
  if (filters.price_min !== undefined || filters.price_max !== undefined) {
    const label = `Precio: ${filters.price_min ? formatPriceCLP(filters.price_min) : '0'} - ${filters.price_max ? formatPriceCLP(filters.price_max) : 'más'}`;
    activeFilters.push({ key: 'price_min', label });
  }
  if (filters.year_min !== undefined || filters.year_max !== undefined) {
    const label = `Año: ${filters.year_min || 'antiguo'} - ${filters.year_max || 'reciente'}`;
    activeFilters.push({ key: 'year_min', label });
  }
  if (filters.search) {
    activeFilters.push({ key: 'search', label: `Búsqueda: "${filters.search}"` });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
      <span className="text-sm text-muted-foreground mr-1">Filtros activos:</span>
      {activeFilters.map((filter, index) => (
        <Badge
          key={`${filter.key}-${index}`}
          variant="secondary"
          className="gap-1 pr-1 hover:bg-secondary/80 cursor-pointer"
          onClick={() => onRemoveFilter(filter.key)}
        >
          {filter.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="text-muted-foreground hover:text-foreground"
      >
        Limpiar todo
      </Button>
    </div>
  );
}

export default CatalogFilters;
