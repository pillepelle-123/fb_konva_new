import { useMemo, useState } from 'react';
import { Palette, Layout, GalleryHorizontal, LayoutGrid } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../../../ui/composites/carousel';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import themesData from '../../../../data/templates/themes.json';
import { LayoutTemplatePreview } from '../../editor/templates/layout-selector';
import { getThemePaletteId } from '../../../../utils/global-themes';
import type { WizardState } from './types';

const featuredTemplates = builtinPageTemplates.slice(0, 6);

interface DesignStepProps {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['design']>) => void;
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
      }`}
    >
      {label}
    </button>
  );
}

export function DesignStep({
  wizardState,
  onChange,
}: DesignStepProps) {
  const [paletteCarouselApi, setPaletteCarouselApi] = useState<CarouselApi>();
  const [themeViewMode, setThemeViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [paletteViewMode, setPaletteViewMode] = useState<'carousel' | 'grid'>('carousel');

  const themeEntries = useMemo(() => {
    return Object.entries(themesData as Record<string, { name: string; description: string; palette?: string }>).map(([id, theme]) => ({
      id,
      name: theme.name ?? id,
      description: theme.description ?? 'Custom theme',
      paletteId: theme.palette ?? 'default',
    }));
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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left pane (replaces old Layout Preview) — Design workspace (1/3) */}
      <div className="w-full lg:w-1/3 flex-shrink-0">
        <div className="rounded-2xl bg-white shadow-sm border p-4 sticky lg:top-24 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Layout</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Choose layout templates and toggle mirrored/paired spreads.
            </p>
          </div>

          {/* Layout templates (compact grid) */}
          <div className="grid gap-3 grid-cols-2">
            {featuredTemplates.map((template) => {
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

          {/* Toggles */}
          <div className="flex flex-wrap gap-2">
            <TogglePill
              active={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
              label="Mirror right page"
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
              onClick={() => onChange({ randomizeLayout: !wizardState.design.randomizeLayout })}
            />
          </div>
        </div>
      </div>

      {/* Right pane (where Design workspace was) — Theme & Color Palette (2/3) */}
      <div className="w-full lg:w-2/3 min-w-0 rounded-2xl bg-white shadow-sm border p-4 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Theme & Color Palette
          </div>

          {/* Theme carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Themes</span>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                onClick={() => setThemeViewMode(themeViewMode === 'carousel' ? 'grid' : 'carousel')}
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
            <div className="relative">
              {themeViewMode === 'carousel' ? (
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {themeEntries.map((theme) => {
                      const isActive = wizardState.design.themeId === theme.id;
                      return (
                        <CarouselItem key={theme.id} className="pl-2 basis-full">
                          <button
                            type="button"
                            onClick={() => onChange({ themeId: theme.id })}
                            className={`w-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
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
                              <span className="text-[10px] text-muted-foreground">Default palette:</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="xxs"
                                onClick={handleSelectThemeDefaultPalette}
                                className="h-auto px-1.5 py-0.5 text-[11px] font-medium"
                                title="Select Theme's Default Palette"
                              >
                                {theme.paletteId}
                              </Button>
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
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-2">
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
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">Default:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="xxs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectThemeDefaultPalette(e);
                            }}
                            className="h-auto px-1 py-0.5 text-[10px] font-medium"
                          >
                            {theme.paletteId}
                          </Button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Palette carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Color Palettes</span>
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                onClick={() => setPaletteViewMode(paletteViewMode === 'carousel' ? 'grid' : 'carousel')}
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
                            className={`w-full rounded-xl border p-4 pl-10 text-left transition hover:shadow-sm ${
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
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto scrollbar-thin pr-2">
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
        </section>
      </div>
    </div>
  );
}

