import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Drawer, DrawerContent, DrawerClose } from './ui/drawer';
import { PlusCircle, ChevronDown, ChevronRight, Check } from 'lucide-react';

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

const SECTIONS = [
  {
    label: 'Computing',
    courses: [
      { label: 'Computer Science', value: 'computer_science' },
      { label: 'Software Development', value: 'software_development' },
      { label: 'Data Science', value: 'data_science' },
      { label: 'Cybersecurity', value: 'cybersecurity' },
    ],
  },
  {
    label: 'Law',
    courses: [
      { label: 'Law', value: 'law' },
      { label: 'International Law', value: 'international_law' },
      { label: 'Business Law', value: 'business_law' },
    ],
  },
  {
    label: 'Medicine',
    courses: [
      { label: 'Medicine', value: 'medicine' },
      { label: 'Dentistry', value: 'dentistry' },
      { label: 'Pharmacy', value: 'pharmacy' },
    ],
  },
];

export default function FieldOfStudyFilterPopover({
  selectedCourses,
  onChange,
  resetSignal,
}: {
  selectedCourses: string[];
  onChange: (values: string[]) => void;
  resetSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover on click outside (desktop only)
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

  // Reset when resetSignal changes
  useEffect(() => {
    if (resetSignal !== undefined) {
      onChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const toggleSection = (label: string) => {
    setExpanded(expanded =>
      expanded.includes(label)
        ? expanded.filter(l => l !== label)
        : [...expanded, label]
    );
  };

  const handleSelect = (value: string) => {
    if (selectedCourses.includes(value)) {
      onChange(selectedCourses.filter(v => v !== value));
    } else {
      onChange([...selectedCourses, value]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const content = (
    <div className={`w-full flex flex-col ${isMobile ? 'p-4 gap-2' : 'p-1 gap-1'}`}>
      {SECTIONS.map(section => (
        <div key={section.label}>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left text-base font-medium"
            onClick={() => toggleSection(section.label)}
          >
            <span>{section.label}</span>
            {expanded.includes(section.label) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expanded.includes(section.label) && (
            <div className="flex flex-col pb-2 w-full">
              {section.courses.map(course => {
                const checked = selectedCourses.includes(course.value);
                return (
                  <div
                    key={course.value}
                    className={`flex items-center px-2 py-1.5 cursor-pointer text-sm`}
                    onClick={() => handleSelect(course.value)}
                  >
                    <span className={
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ' +
                      (checked ? 'bg-primary text-primary-foreground' : 'opacity-50')
                    }>
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span>{course.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {selectedCourses.length > 0 && (
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
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
          onClick={() => setOpen(true)}
          type="button"
          ref={buttonRef}
        >
          <PlusCircle className="mr-1 h-4 w-4" />
          Field of Study
          {selectedCourses.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="rounded-sm px-1 font-normal bg-secondary text-xs lg:hidden">
                {selectedCourses.length}
              </span>
              <span className="hidden space-x-1 lg:flex">
                {selectedCourses.length > 2 ? (
                  <span className="rounded-sm px-1 font-normal bg-secondary">
                    {selectedCourses.length} selected
                  </span>
                ) : (
                  SECTIONS.flatMap(s => s.courses)
                    .filter(course => selectedCourses.includes(course.value))
                    .map(course => (
                      <span key={course.value} className="rounded-sm px-1 font-normal bg-secondary">
                        {course.label}
                      </span>
                    ))
                )}
              </span>
            </>
          )}
        </Button>
        <DrawerContent>
          <div className="flex justify-between items-center p-4 pb-2">
            <span className="font-semibold text-lg">Field of Study</span>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">Close</span>
                ×
              </Button>
            </DrawerClose>
          </div>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        className="h-8 border-dashed"
        onClick={() => setOpen(v => !v)}
        type="button"
        ref={buttonRef}
      >
        <PlusCircle className="mr-1 h-4 w-4" />
        Field of Study
        {selectedCourses.length > 0 && (
          <>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span className="rounded-sm px-1 font-normal bg-secondary text-xs lg:hidden">
              {selectedCourses.length}
            </span>
            <span className="hidden space-x-1 lg:flex">
              {selectedCourses.length > 2 ? (
                <span className="rounded-sm px-1 font-normal bg-secondary">
                  {selectedCourses.length} selected
                </span>
              ) : (
                SECTIONS.flatMap(s => s.courses)
                  .filter(course => selectedCourses.includes(course.value))
                  .map(course => (
                    <span key={course.value} className="rounded-sm px-1 font-normal bg-secondary">
                      {course.label}
                    </span>
                  ))
              )}
            </span>
          </>
        )}
      </Button>
      {open && (
        <div className="absolute z-30 mt-2 w-64 max-h-[60vh] overflow-y-auto rounded-md border bg-popover p-2 shadow-lg" ref={popoverRef}>
          {content}
        </div>
      )}
    </div>
  );
} 