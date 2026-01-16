import { useMemo, useState, useEffect } from 'react';
import { Palette, GalleryHorizontal, LayoutGrid, Filter, LayoutPanelLeft, PaintbrushVertical, PanelLeftRightDashed, ArrowLeftRight, Dices } from 'lucide-react';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { Button } from '../../../ui/primitives/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../ui/primitives/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../../../ui/composites/carousel';

import { LayoutTemplatePreview } from '../../editor/templates/layout-template-preview';
import { TogglePill } from './toggle-pill';
import type { WizardState } from './types';

import { colorPalettes } from '../../../../data/templates/color-palettes';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import themesData from '../../../../data/templates/themes';
import { getThemePaletteId } from '../../../../utils/global-themes';

type CategoryFilter = 'all' | 'structured' | 'playful' | 'creative' | 'minimal';

interface DesignStepProps {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['design']>) => void;
}

export function DesignStep({
  wizardState,
  onChange,
}: DesignStepProps) {
  const [paletteCarouselApi, setPaletteCarouselApi] = useState<CarouselApi>();
  const [themeCarouselApi, setThemeCarouselApi] = useState<CarouselApi>();
  const [themeViewMode, setThemeViewMode] = useState<'carousel' | 'grid'>('grid');
  const [paletteViewMode, setPaletteViewMode] = useState<'carousel' | 'grid'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Get all available categories
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    builtinPageTemplates.forEach(template => {
      if (template.category) {
        categories.add(template.category);
      }
    });
    return Array.from(categories).sort();
  }, []);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'all') {
      return builtinPageTemplates;
    }
    return builtinPageTemplates.filter(template => template.category === categoryFilter);
  }, [categoryFilter]);

  const themeEntries = useMemo(() => {
    return Object.entries(themesData as Record<string, { name: string; description: string; palette?: string }>).map(([id, theme]) => {
      const paletteId = theme.palette ?? 'default';
      const palette = colorPalettes.find(p => p.id === paletteId);
      return {
        id,
        name: theme.name ?? id,
        description: theme.description ?? 'Custom theme',
        paletteId,
        paletteName: palette?.name || paletteId,
      };
    });
  }, []);

  // Get theme's default palette ID for current theme
  const currentThemePaletteId = useMemo(() => {
    return getThemePaletteId(wizardState.design.themeId) ?? 'default';
  }, [wizardState.design.themeId]);

  // Build palette list with "Theme's Default Palette" as first entry
  const paletteEntries = useMemo(() => {
    const themePalette = colorPalettes.find(p => p.id === currentThemePaletteId);
    const otherPalettes = colorPalettes.filter(p => p.id !== currentThemePaletteId);
    
    // First entry: "Theme's Default Palette" (virtual entry)
    const themeDefaultEntry = {
      id: null as string | null, // null indicates "Theme's Default Palette"
      name: themePalette?.name || 'Default', // Show actual palette name
      subtitle: "Theme's Default Palette", // Show as subtitle
      colors: themePalette?.colors || colorPalettes[0].colors,
      isThemeDefault: true,
    };
    
    return [themeDefaultEntry, ...otherPalettes];
  }, [currentThemePaletteId]);

  // Function to select Theme's Default Palette and scroll to it
  const handleSelectThemeDefaultPalette = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent theme selection when clicking the palette button
    onChange({ paletteId: null });
    // Scroll to first item (Theme's Default Palette) - index 0
    if (paletteCarouselApi) {
      paletteCarouselApi.scrollTo(0);
    }
  };

  // Scroll to selected theme when switching to carousel mode
  useEffect(() => {
    if (themeViewMode === 'carousel' && themeCarouselApi) {
      const selectedIndex = themeEntries.findIndex(theme => theme.id === wizardState.design.themeId);
      if (selectedIndex !== -1) {
        // Use setTimeout to ensure carousel is fully rendered
        setTimeout(() => {
          themeCarouselApi.scrollTo(selectedIndex);
        }, 100);
      }
    }
  }, [themeViewMode, themeCarouselApi, wizardState.design.themeId, themeEntries]);

  // Scroll to selected palette when switching to carousel mode
  useEffect(() => {
    if (paletteViewMode === 'carousel' && paletteCarouselApi) {
      const selectedIndex = paletteEntries.findIndex(palette => 
        palette.id === null 
          ? wizardState.design.paletteId === null
          : wizardState.design.paletteId === palette.id
      );
      if (selectedIndex !== -1) {
        // Use setTimeout to ensure carousel is fully rendered
        setTimeout(() => {
          paletteCarouselApi.scrollTo(selectedIndex);
        }, 100);
      }
    }
  }, [paletteViewMode, paletteCarouselApi, wizardState.design.paletteId, paletteEntries]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left pane (replaces old Layout Preview) — Design workspace (1/3) */}
      <div className="w-full lg:w-1/3 flex-shrink-0 flex flex-col ">
        <div className="rounded-2xl bg-white shadow-sm border p-3 flex flex-col h-full">
          <div className="flex-shrink-0">
            {/* <div className="flex items-center gap-2 text-foreground"> */}
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LayoutPanelLeft className="h-5 w-5" />
              Layout
            </div>
            {/* <p className="text-xs text-muted-foreground mt-3">
              Choose layout templates and toggle mirrored/paired spreads.
            </p> */}
          </div>

          <div className="flex-shrink-0 space-y-3 mt-3">
          {/* Category filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}
            >
              <SelectTrigger className="h-7 text-xs">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span>
                    {categoryFilter === 'all' 
                      ? 'All' 
                      : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                  </span>
            </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggles */}
            <div className="flex gap-2">
              <TogglePill
                active={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
                label="Mirror right page"
                icon={<PanelLeftRightDashed className="h-4 w-4" />}
                onClick={() => {
                  onChange({ 
                    mirrorLayout: !wizardState.design.mirrorLayout,
                    pickLeftRight: false,
                    leftLayoutTemplate: null,
                    rightLayoutTemplate: null,
                  });
                }}
              />
              <TogglePill
                active={wizardState.design.pickLeftRight}
                label="Pick Left & Right"
                icon={<ArrowLeftRight className="h-4 w-4" />}
                onClick={() => {
                  const newPickLeftRight = !wizardState.design.pickLeftRight;
                  onChange({ 
                    pickLeftRight: newPickLeftRight,
                    mirrorLayout: false,
                    leftLayoutTemplate: newPickLeftRight ? wizardState.design.layoutTemplate || null : null,
                    rightLayoutTemplate: newPickLeftRight ? null : null,
                  });
                }}
              />
                <TogglePill
                active={wizardState.design.randomizeLayout}
                label="Randomize spreads"
                icon={<Dices className="h-4 w-4" />}
                onClick={() => onChange({ randomizeLayout: !wizardState.design.randomizeLayout })}
                />
            </div>
          </div>

          {/* Layout templates (compact grid with scroll) */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1 mt-3">
            <div className="grid gap-3 grid-cols-2 p-1">
              {filteredTemplates.map((template) => {
              const isSelectedLeft = wizardState.design.leftLayoutTemplate?.id === template.id;
              const isSelectedRight = wizardState.design.rightLayoutTemplate?.id === template.id;
              const isSelected = !wizardState.design.pickLeftRight && wizardState.design.layoutTemplate?.id === template.id;
              
              const handleLeftCheckboxChange = (checked: boolean) => {
                if (checked) {
                  // Wenn bereits ein anderes Template für Left ausgewählt ist, wird es ersetzt
                  onChange({ leftLayoutTemplate: template });
                } else {
                  // Wenn dieses Template für Left deaktiviert wird
                  onChange({ leftLayoutTemplate: null });
                }
              };

              const handleRightCheckboxChange = (checked: boolean) => {
                if (checked) {
                  // Wenn bereits ein anderes Template für Right ausgewählt ist, wird es ersetzt
                  onChange({ rightLayoutTemplate: template });
                } else {
                  // Wenn dieses Template für Right deaktiviert wird
                  onChange({ rightLayoutTemplate: null });
                }
              };

              return (
                <div
                  key={template.id}
                  className={`rounded-xl border p-2 transition hover:shadow-sm aspect-[3/4] flex items-center justify-center relative ${
                    isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : 
                    isSelectedLeft || isSelectedRight ? 'border-primary/50 bg-primary/5' :
                    'border-border bg-card'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (!wizardState.design.pickLeftRight) {
                        onChange({ layoutTemplate: template, leftLayoutTemplate: null, rightLayoutTemplate: null });
                      }
                    }}
                    className="w-full h-full flex items-center justify-center"
                    title={template.name}
                  >
                    <div className="w-full max-w-[100px]">
                      <LayoutTemplatePreview 
                        template={template} 
                        showLegend={false}
                        showItemLabels={false}
                      />
                    </div>
                  </button>
                  
                  {/* Checkboxen nur anzeigen, wenn "Pick Left & Right" aktiv ist */}
                  {wizardState.design.pickLeftRight && (
                    <>
                      {/* L-Checkbox oben links */}
                      <div 
                        className="absolute top-1 left-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CheckboxPrimitive.Root
                          checked={isSelectedLeft}
                          onCheckedChange={handleLeftCheckboxChange}
                          className="h-5 w-5 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center"
                        >
                          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current text-[10px] font-semibold">
                            L
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </div>
                      {/* R-Checkbox oben rechts */}
                      <div 
                        className="absolute top-1 right-1 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CheckboxPrimitive.Root
                          checked={isSelectedRight}
                          onCheckedChange={handleRightCheckboxChange}
                          className="h-5 w-5 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex items-center justify-center"
                        >
                          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current text-[10px] font-semibold">
                            R
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* Right pane (where Design workspace was) — Theme & Color Palette (2/3) */}
      <div className="w-full lg:w-2/3 min-w-0 flex flex-col gap-4 flex-1 min-h-0">
        {/* Themes container */}
        {/* {`rounded-2xl bg-white shadow-sm border p-3 space-y-4 flex flex-col ${themeViewMode === 'carousel' ? 'h-auto' : 'max-h-[400px] overflow-hidden'}`} */}
        <div className="rounded-2xl bg-white shadow-sm border p-3 space-y-4 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PaintbrushVertical
              className="h-5 w-5"
            />
              Themes
          </div>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
              onClick={() => {
                const newMode = themeViewMode === 'carousel' ? 'grid' : 'carousel';
                setThemeViewMode(newMode);
                // If switching to grid, ensure palette is in carousel mode
                if (newMode === 'grid') {
                  setPaletteViewMode('carousel');
                }
                // Scroll logic is handled by useEffect
              }}
                className="h-6 w-6 p-0"
                title={themeViewMode === 'carousel' ? 'Show all Themes in Grid' : 'Themes Carousel'}
              >
                {themeViewMode === 'carousel' ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <GalleryHorizontal className="h-5 w-5" />
                )}
              </Button>
            </div>

          {/* Theme carousel */}
          <div className={`space-y-2 ${themeViewMode === 'carousel' ? '' : 'flex-1 min-h-0 overflow-y-auto scrollbar-thin'}`}>
            <div className="relative">
              {themeViewMode === 'carousel' ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                  setApi={setThemeCarouselApi}
                >
                  <CarouselContent className="-ml-2">
                    {themeEntries.map((theme) => {
                      const isActive = wizardState.design.themeId === theme.id;
                      return (
                        <CarouselItem key={theme.id} className="pl-2 basis-full">
                          <button
                            type="button"
                            onClick={() => onChange({ themeId: theme.id })}
                            className={`w-full h-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
                              isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                            }`}
                            title={theme.name}
                          >
                            <p className="font-semibold flex items-center gap-2">
                              <Palette className="h-4 w-4 text-primary" />
                              {theme.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{theme.description}</p>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">Default palette: {theme.paletteName}</span>
                              
                            </div>
                          </button>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {themeEntries.map((theme) => {
                    const isActive = wizardState.design.themeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onChange({ themeId: theme.id })}
                        className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        title={theme.name}
                      >
                        <p className="font-semibold text-xs flex items-center gap-1.5">
                          <Palette className="h-3 w-3 text-primary" />
                          {theme.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
                        {/* <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">Default:</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectThemeDefaultPalette(e);
                            }}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-auto px-1 py-0.5 text-[10px] font-medium cursor-pointer transition-colors"
                          >
                            {theme.paletteName}
                          </span>
                        </div> */}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          </div>

        {/* Color Palette container */}
        <div className="rounded-2xl bg-white shadow-sm border p-3 space-y-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-5 w-5" />
              Color Palette
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                onClick={() => {
                  onChange({ paletteId: null });
                  // Scroll to first item (Theme's Default Palette) - index 0
                  if (paletteCarouselApi) {
                    paletteCarouselApi.scrollTo(0);
                  }
                }}
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                title="Select Theme's Default Palette"
              >
                Theme's default
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
              onClick={() => {
                const newMode = paletteViewMode === 'carousel' ? 'grid' : 'carousel';
                setPaletteViewMode(newMode);
                // If switching to grid, ensure theme is in carousel mode
                if (newMode === 'grid') {
                  setThemeViewMode('carousel');
                }
                // Scroll logic is handled by useEffect
              }}
                className="h-6 w-6 p-0"
                title={paletteViewMode === 'carousel' ? 'Show all Color Palettes in Grid' : 'Color Palettes Carousel'}
              >
                {paletteViewMode === 'carousel' ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <GalleryHorizontal className="h-5 w-5" />
                )}
              </Button>
            </div>
            </div>

          {/* Palette carousel */}
          <div className={`space-y-2 ${paletteViewMode === 'carousel' ? '' : 'flex-1 min-h-0 overflow-y-auto scrollbar-thin'}`}>
            <div className="relative">
              {paletteViewMode === 'carousel' ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                  setApi={setPaletteCarouselApi}
                >
                  <CarouselContent className="-ml-2">
                    {paletteEntries.map((palette) => {
                      // Check if this is the active palette
                      // null paletteId means "Theme's Default Palette"
                      const isActive = palette.id === null 
                        ? wizardState.design.paletteId === null
                        : wizardState.design.paletteId === palette.id;
                      const colorValues = Object.values(palette.colors || {});
                      const hasSubtitle = 'subtitle' in palette && palette.subtitle;
                      return (
                        <CarouselItem key={palette.id ?? 'theme-default'} className="pl-2 basis-full">
                          <button
                            type="button"
                            onClick={() => onChange({ paletteId: palette.id })}
                            className={`w-full h-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
                              isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                            }`}
                            title={palette.name}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <p className="font-semibold">{palette.name}</p>
                                {hasSubtitle && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{palette.subtitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1">
                              {colorValues.map((hex, idx) => (
                                <span
                                  key={`${palette.id ?? 'theme-default'}-${idx}`}
                                  className="inline-block h-4 w-4 rounded border"
                                  style={{ backgroundColor: hex as string }}
                                  title={hex as string}
                                />
                              ))}
                            </div>
                          </button>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {paletteEntries.map((palette) => {
                    const isActive = palette.id === null 
                      ? wizardState.design.paletteId === null
                      : wizardState.design.paletteId === palette.id;
                    const colorValues = Object.values(palette.colors || {});
                    const hasSubtitle = 'subtitle' in palette && palette.subtitle;
                    return (
                      <button
                        key={palette.id ?? 'theme-default'}
                        type="button"
                        onClick={() => onChange({ paletteId: palette.id })}
                        className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                        }`}
                        title={palette.name}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="font-semibold text-xs">{palette.name}</p>
                            {hasSubtitle && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{palette.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {colorValues.map((hex, idx) => (
                            <span
                              key={`${palette.id ?? 'theme-default'}-${idx}`}
                              className="inline-block h-3 w-3 rounded border"
                              style={{ backgroundColor: hex as string }}
                              title={hex as string}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

