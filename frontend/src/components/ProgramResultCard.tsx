import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Drawer, DrawerContent, DrawerClose } from './ui/drawer';
import { Check, PlusCircle } from 'lucide-react';
import universityCover from '../assets/university_cover.png';
import { useProgramListsApi } from '../services/programLists';
import { toast } from 'sonner';

interface Program {
  id: string;
  name: string;
  university: string;
  country: string;
  type: string;
  ranking: string;
  cost: number;
  field: string;
  imageUrl?: string;
  malaysiaRank?: number;
  worldRank?: number;
  intakeMonths?: string[];
  fees?: {
    registration_fee?: number;
    resource_fee?: number;
    tuition_fee?: number;
  };
}

interface List {
  id: string;
  label: string;
  program_ids: string[];
  title: string;
  emoji: string;
}

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

interface ProgramResultCardProps {
  program: Program;
  lists: List[];
  onRemoveProgramFromList?: (programId: string) => void;
}

const ProgramResultCard: React.FC<ProgramResultCardProps> = ({ program, lists, onRemoveProgramFromList }) => {
  const [selectedLists, _setSelectedLists] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const isMobile = useIsMobile();
  const [updatingListId, setUpdatingListId] = useState<string | null>(null);
  const { update } = useProgramListsApi();

  const programIdStr = String(program.id);

  const isInList = (list: List) => list.program_ids.includes(programIdStr);

  const handleToggleList = async (list: List) => {
    const wasInList = isInList(list);
    const prevProgramIds = [...list.program_ids];
    let newProgramIds: string[];
    if (wasInList) {
      newProgramIds = list.program_ids.filter(id => id !== programIdStr);
    } else {
      newProgramIds = [...list.program_ids, programIdStr];
    }
    // Ensure all are strings
    newProgramIds = newProgramIds.map(String);
    // Optimistically update
    list.program_ids = newProgramIds;
    setUpdatingListId(list.id);
    try {
      await update(list.id, {
        title: list.title,
        emoji: list.emoji,
        program_ids: newProgramIds,
      });
      toast.success(wasInList ? 'Removed from list' : 'Added to list');
      if (wasInList && onRemoveProgramFromList) {
        onRemoveProgramFromList(programIdStr);
      }
    } catch (e) {
      list.program_ids = prevProgramIds; // Roll back on error
      toast.error('Failed to update list');
    } finally {
      setUpdatingListId(null);
    }
  };

  // Close popover on click outside (desktop only)
  useEffect(() => {
    if (!popoverOpen || isMobile) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpen, isMobile]);

  // Position popover using portal (desktop only)
  useEffect(() => {
    if (!popoverOpen || isMobile) return;
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (button && popover) {
      const rect = button.getBoundingClientRect();
      setPopoverStyle({
        position: 'absolute',
        left: rect.right - 192, // 192px = w-48
        top: rect.top - popover.offsetHeight - 8 + window.scrollY, // 8px margin
        zIndex: 9999,
        width: 192,
      });
    }
  }, [popoverOpen, isMobile]);

  const getEstimatedCost = () => {
    const fees = (program as any).fees || {};
    const reg = fees.registration_fee ?? null;
    const res = fees.resource_fee ?? null;
    const tuition = fees.tuition_fee ?? null;
    const values = [reg, res, tuition].filter(v => v != null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0);
  };

  const listContent = (
    <div className="flex flex-col gap-2">
      {lists.length === 0 ? (
        <span className="text-muted-foreground text-sm">Add a new list first.</span>
      ) : (
        lists.map(list => (
          <label key={list.id} className="flex items-center gap-2 cursor-pointer text-sm">
            <span
              className={
                'flex h-4 w-4 items-center justify-center rounded-sm border border-primary ' +
                (isInList(list) ? 'bg-primary text-primary-foreground' : 'opacity-50')
              }
            >
              {isInList(list) && <Check className="h-3 w-3" />}
            </span>
            <input
              type="checkbox"
              checked={isInList(list)}
              disabled={updatingListId === list.id}
              onChange={() => handleToggleList(list)}
              className="hidden"
            />
            {list.label}
          </label>
        ))
      )}
    </div>
  );

  return (
    <Card className="!flex-col md:!flex-row p-0 overflow-hidden shadow-none w-full border max-w-4xl min-h-40">
      {/* Left image */}
      <div className="md:shrink-0">
        <div
          className="w-full h-40 md:h-full md:w-48 bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url('${universityCover}')` }}
        />
      </div>
      {/* Right content */}
      <div className="flex flex-col justify-between flex-1 h-full p-4 min-w-0 min-h-40 sm:min-h-40">
        <div>
          {/* Tags */}
          <div className="flex gap-2 mb-2">
            {program.malaysiaRank != null && (
              <span className="bg-primary/10 text-primary text-xs font-semibold rounded px-2 py-0.5">
                #{program.malaysiaRank} in Malaysia
              </span>
            )}
            {program.worldRank != null && (
              <span className="bg-secondary text-xs font-semibold rounded px-2 py-0.5">
                #{program.worldRank} in World
              </span>
            )}
          </div>
          {/* Program name */}
          <div className="font-bold text-base truncate mb-1">{program.name}</div>
          {/* University, location, type */}
          <div className="text-muted-foreground text-sm flex flex-wrap items-center gap-1 mb-2">
            <span>{program.university}</span>
            <span className="mx-1">&middot;</span>
            <span>{program.country}</span>
            <span className="mx-1">&middot;</span>
            <span>{program.type.charAt(0).toUpperCase() + program.type.slice(1)}</span>
          </div>
          {/* Estimated cost and intake */}
          <div className="text-sm mb-1">
            <span className="font-medium">Estimated Cost:</span>{' '}
            {getEstimatedCost() == null
              ? 'No Data'
              : `MYR ${getEstimatedCost().toLocaleString()}`}
          </div>
          <div className="text-sm">
            <span className="font-medium">Intake:</span> {program.intakeMonths ? program.intakeMonths.join(', ') : 'Jan, Sep'}
          </div>
        </div>
        {/* Add to List button bottom right */}
        <div className="flex justify-end mt-2">
          <div>
            <Button
              size="sm"
              variant={selectedLists.length > 0 ? 'default' : 'outline'}
              ref={buttonRef}
              onClick={() => setPopoverOpen(v => !v)}
              type="button"
              className={`flex items-center gap-1 transition-colors ${selectedLists.length > 0 ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <PlusCircle className="h-4 w-4" />
              Add to List
              {selectedLists.length > 0 && <Check className="h-4 w-4 ml-1" />}
            </Button>
            {!isMobile && popoverOpen && typeof window !== 'undefined' && ReactDOM.createPortal(
              <div
                ref={popoverRef}
                className="rounded-md border bg-popover p-2 shadow-lg z-50"
                style={popoverStyle}
              >
                <div className="font-medium text-sm mb-2">Add to List</div>
                {listContent}
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer open={popoverOpen} onOpenChange={setPopoverOpen}>
          <DrawerContent>
            <div className="flex justify-between items-center p-4 pb-2">
              <span className="font-semibold text-lg">Add to List</span>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="sr-only">Close</span>
                  ×
                </Button>
              </DrawerClose>
            </div>
            <div className="p-4">
              {listContent}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </Card>
  );
};

export default ProgramResultCard; 