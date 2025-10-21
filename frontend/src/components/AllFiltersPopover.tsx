import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Filter, Check } from 'lucide-react';
import { DualRangeSlider } from './ui/dual-range-slider';
import { Drawer, DrawerContent, DrawerClose } from './ui/drawer';

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AllFiltersPopoverProps {
  countryOptions: Option[];
  typeOptions: Option[];
  rankingOptions: Option[];
  countryFilter: string[];
  setCountryFilter: (values: string[]) => void;
  typeFilter: string[];
  setTypeFilter: (values: string[]) => void;
  rankingFilter: string[];
  setRankingFilter: (values: string[]) => void;
  costMin: number;
  setCostMin: (v: number) => void;
  costMax: number;
  setCostMax: (v: number) => void;
  costMinLimit?: number;
  costMaxLimit?: number;
}

export function AllFiltersPopover({
  countryOptions,
  typeOptions,
  rankingOptions,
  countryFilter,
  setCountryFilter,
  typeFilter,
  setTypeFilter,
  rankingFilter,
  setRankingFilter,
  costMin,
  setCostMin,
  costMax,
  setCostMax,
  costMinLimit = 0,
  costMaxLimit = 100000,
}: AllFiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || isMobile) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, isMobile]);

  const renderSection = (
    title: string,
    options: Option[],
    selected: string[],
    setSelected: (values: string[]) => void
  ) => (
    <div className="mb-4">
      <div className="mb-2 font-medium text-sm text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-1 w-full">
        {options.map(option => {
          const isSelected = selected.includes(option.value);
          return (
            <div
              key={option.value}
              className="flex items-center cursor-pointer text-sm w-full"
              onClick={() => {
                let newValues;
                if (isSelected) {
                  newValues = selected.filter(v => v !== option.value);
                } else {
                  newValues = [...selected, option.value];
                }
                setSelected(newValues);
              }}
            >
              <span className={
                'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ' +
                (isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50')
              }>
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
              <span>{option.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Cost slider logic
  const handleInputMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = costMinLimit;
    if (val < costMinLimit) val = costMinLimit;
    if (val > costMax - 1) val = costMax - 1;
    setCostMin(val);
  };
  const handleInputMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = costMaxLimit;
    if (val > costMaxLimit) val = costMaxLimit;
    if (val < costMin + 1) val = costMin + 1;
    setCostMax(val);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Filter className="mr-1 h-4 w-4" />
          All filters
        </Button>
        <DrawerContent>
          <div className="flex justify-between items-center p-4 pb-2">
            <span className="font-semibold text-lg">All filters</span>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Close</span>
                ×
              </Button>
            </DrawerClose>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-4 flex flex-col gap-4 w-full">
            {renderSection('Country', countryOptions, countryFilter, setCountryFilter)}
            <Separator />
            {renderSection('Type', typeOptions, typeFilter, setTypeFilter)}
            <Separator />
            {renderSection('Ranking', rankingOptions, rankingFilter, setRankingFilter)}
            <Separator />
            <div className="w-full">
              <div className="mb-2 font-medium text-sm text-muted-foreground">Cost (MYR)</div>
              <div className="flex flex-wrap items-center gap-2 mb-2 w-full">
                <Input
                  type="number"
                  min={costMinLimit}
                  max={costMax - 1}
                  value={costMin}
                  onChange={handleInputMin}
                  className="w-20 h-8 text-sm"
                  aria-label="Min cost"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="number"
                  min={costMin + 1}
                  max={costMaxLimit}
                  value={costMax}
                  onChange={handleInputMax}
                  className="w-20 h-8 text-sm"
                  aria-label="Max cost"
                />
              </div>
              <DualRangeSlider
                min={costMinLimit}
                max={costMaxLimit}
                step={100}
                value={[costMin, costMax]}
                onValueChange={([min, max]: number[]) => {
                  setCostMin(min);
                  setCostMax(max);
                }}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1 w-full">
                <span>{costMinLimit.toLocaleString()}</span>
                <span>{costMaxLimit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        className="h-8 border-dashed"
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <Filter className="mr-1 h-4 w-4" />
        All filters
      </Button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-30 mt-2 w-80 max-h-[70vh] overflow-y-auto p-4 flex flex-col gap-4 rounded-md border bg-popover shadow-lg"
        >
          {renderSection('Country', countryOptions, countryFilter, setCountryFilter)}
          <Separator />
          {renderSection('Type', typeOptions, typeFilter, setTypeFilter)}
          <Separator />
          {renderSection('Ranking', rankingOptions, rankingFilter, setRankingFilter)}
          <Separator />
          <div className="w-full">
            <div className="mb-2 font-medium text-sm text-muted-foreground">Cost (MYR)</div>
            <div className="flex flex-wrap items-center gap-2 mb-2 w-full">
              <Input
                type="number"
                min={costMinLimit}
                max={costMax - 1}
                value={costMin}
                onChange={handleInputMin}
                className="w-20 h-8 text-sm"
                aria-label="Min cost"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="number"
                min={costMin + 1}
                max={costMaxLimit}
                value={costMax}
                onChange={handleInputMax}
                className="w-20 h-8 text-sm"
                aria-label="Max cost"
              />
            </div>
            <DualRangeSlider
              min={costMinLimit}
              max={costMaxLimit}
              step={100}
              value={[costMin, costMax]}
              onValueChange={([min, max]: number[]) => {
                setCostMin(min);
                setCostMax(max);
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 w-full">
              <span>{costMinLimit.toLocaleString()}</span>
              <span>{costMaxLimit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 