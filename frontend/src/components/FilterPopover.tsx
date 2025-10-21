import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { PlusCircle, Check } from 'lucide-react';
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

interface FilterPopoverProps {
  title: string;
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  popoverWidth?: string;
}

export function FilterPopover({ title, options, selectedValues, onChange, popoverWidth }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value: string) => {
    let newValues;
    if (selectedValues.includes(value)) {
      newValues = selectedValues.filter(v => v !== value);
    } else {
      newValues = [...selectedValues, value];
    }
    onChange(newValues);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Popover content for desktop
  const popoverContent = (
    <div
      ref={popoverRef}
      className={`absolute z-30 mt-2 rounded-md border bg-popover p-2 shadow-lg ${popoverWidth || 'w-56'}`}
      style={{ left: 0 }}
    >
      <input
        className="mb-2 w-full rounded border px-2 py-1 text-sm"
        placeholder={`Search ${title}`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto">
        {filteredOptions.length === 0 && (
          <div className="p-2 text-muted-foreground text-sm">No results found.</div>
        )}
        {filteredOptions.map(option => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <div
              key={option.value}
              className="flex items-center px-2 py-1.5 cursor-pointer text-sm"
              onClick={() => handleSelect(option.value)}
            >
              <span className={
                'mr-2 flex w-4 h-4 items-center justify-center rounded-sm border border-primary flex-shrink-0 ' +
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
      {selectedValues.length > 0 && (
        <>
          <Separator className="my-2" />
          <button
            className="w-full text-center text-xs text-muted-foreground hover:underline"
            onClick={e => { e.preventDefault(); handleClear(); }}
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  );

  // Drawer content for mobile
  const drawerContent = (
    <div className="w-full p-4">
      <input
        className="mb-2 w-full rounded border px-2 py-1 text-sm"
        placeholder={`Search ${title}`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto">
        {filteredOptions.length === 0 && (
          <div className="p-2 text-muted-foreground text-sm">No results found.</div>
        )}
        {filteredOptions.map(option => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <div
              key={option.value}
              className="flex items-center px-2 py-1.5 cursor-pointer text-sm"
              onClick={() => handleSelect(option.value)}
            >
              <span className={
                'mr-2 flex w-4 h-4 items-center justify-center rounded-sm border border-primary flex-shrink-0 ' +
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
      {selectedValues.length > 0 && (
        <>
          <Separator className="my-2" />
          <button
            className="w-full text-center text-xs text-muted-foreground hover:underline"
            onClick={e => { e.preventDefault(); handleClear(); }}
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  );

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
          <PlusCircle className="mr-1 h-4 w-4" />
          {title}
          {selectedValues.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="rounded-sm px-1 font-normal bg-secondary text-xs lg:hidden">
                {selectedValues.length}
              </span>
              <span className="hidden space-x-1 lg:flex">
                {selectedValues.length > 2 ? (
                  <span className="rounded-sm px-1 font-normal bg-secondary">
                    {selectedValues.length} selected
                  </span>
                ) : (
                  options
                    .filter(option => selectedValues.includes(option.value))
                    .map(option => (
                      <span key={option.value} className="rounded-sm px-1 font-normal bg-secondary">
                        {option.label}
                      </span>
                    ))
                )}
              </span>
            </>
          )}
        </Button>
        <DrawerContent>
          <div className="flex justify-between items-center p-4 pb-2">
            <span className="font-semibold text-lg">{title}</span>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Close</span>
                ×
              </Button>
            </DrawerClose>
          </div>
          {drawerContent}
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
        <PlusCircle className="mr-1 h-4 w-4" />
        {title}
        {selectedValues.length > 0 && (
          <>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span className="rounded-sm px-1 font-normal bg-secondary text-xs lg:hidden">
              {selectedValues.length}
            </span>
            <span className="hidden space-x-1 lg:flex">
              {selectedValues.length > 2 ? (
                <span className="rounded-sm px-1 font-normal bg-secondary">
                  {selectedValues.length} selected
                </span>
              ) : (
                options
                  .filter(option => selectedValues.includes(option.value))
                  .map(option => (
                    <span key={option.value} className="rounded-sm px-1 font-normal bg-secondary">
                      {option.label}
                    </span>
                  ))
              )}
            </span>
          </>
        )}
      </Button>
      {open && popoverContent}
    </div>
  );
} 