import { QualitySelector } from '../../shared/forms/quality-selector';
import { PageRangeSelector } from '../../shared/forms/page-range-selector';
import { ExportProgress } from './export-progress';
import { Checkbox } from '../../ui/primitives/checkbox';
import { Label } from '../../ui/primitives/label';
import { FormField } from '../../ui/layout/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/primitives/select';

interface PDFExportContentProps {
  quality: 'preview' | 'medium' | 'printing' | 'excellent';
  setQuality: (value: 'preview' | 'medium' | 'printing' | 'excellent') => void;
  pageRange: 'all' | 'range' | 'current';
  setPageRange: (value: 'all' | 'range' | 'current') => void;
  startPage: number;
  setStartPage: (value: number) => void;
  endPage: number;
  setEndPage: (value: number) => void;
  maxPages: number;
  userRole?: 'author' | 'publisher' | 'owner' | null; // book_friends.book_role
  userAdminRole?: string | null; // users.role
  isExporting?: boolean;
  progress?: number;
  useCMYK?: boolean;
  setUseCMYK?: (value: boolean) => void;
  iccProfile?: 'iso-coated-v2' | 'fogra39';
  setIccProfile?: (value: 'iso-coated-v2' | 'fogra39') => void;
}

export function PDFExportContent({
  quality,
  setQuality,
  pageRange,
  setPageRange,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  maxPages,
  userRole,
  userAdminRole,
  isExporting = false,
  progress = 0,
  useCMYK = false,
  setUseCMYK,
  iccProfile = 'fogra39',
  setIccProfile
}: PDFExportContentProps) {
  return (
    <div className="p-1">
      <div className="flex gap-4 items-start">
        <div className="w-1/2">
          <QualitySelector value={quality} onChange={setQuality} userRole={userRole} userAdminRole={userAdminRole} />
        </div>
        
        <div className="w-1/2">
          <PageRangeSelector
            pageRange={pageRange}
            startPage={startPage}
            endPage={endPage}
            maxPages={maxPages}
            onPageRangeChange={setPageRange}
            onStartPageChange={setStartPage}
            onEndPageChange={setEndPage}
          />
        </div>
      </div>
      
      {setUseCMYK && (
        <div className="mt-4 space-y-3">
          <FormField label="Druck-Optionen:">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={useCMYK}
                onCheckedChange={(checked) => setUseCMYK(checked === true)}
                disabled={isExporting}
              />
              <span className="text-sm">
                CMYK (für professionellen Druck)
              </span>
            </Label>
          </FormField>
          
          {useCMYK && setIccProfile && (
            <FormField label="ICC-Profil:">
              <Select
                value={iccProfile}
                onValueChange={(value) => setIccProfile(value as 'iso-coated-v2' | 'fogra39')}
                defaultValue="fogra39"
              >
                <SelectTrigger className="w-full" disabled={isExporting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso-coated-v2">
                    ISO Coated v2 300 ECI
                  </SelectItem>
                  <SelectItem value="fogra39">
                    FOGRA 39 (Coated FOGRA39) - Empfohlen für Prodigi
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {iccProfile === 'iso-coated-v2' 
                  ? 'Standard für europäischen Offsetdruck'
                  : 'Empfohlen für Prodigi Softcover-Fotobücher'}
              </p>
            </FormField>
          )}
        </div>
      )}
      
      {isExporting && <ExportProgress progress={progress} />}
    </div>
  );
}


