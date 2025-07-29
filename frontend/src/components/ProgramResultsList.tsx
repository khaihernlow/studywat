import React, { useEffect } from 'react';
import type { Program } from '@/services/programsApi';
import ProgramResultCard from './ProgramResultCard';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './ui/pagination';
import { Skeleton } from './ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from './ui/select';

interface List {
  id: string;
  label: string;
  program_ids: string[];
  title: string;
  emoji: string;
}

interface ProgramResultsListProps {
  countryFilter: string[];
  typeFilter: string[];
  rankingFilter: string[];
  costMin: number;
  costMax: number;
  fieldOfStudyCourses: string[];
  universityFilter: string[];
  lists: List[];
  programs?: Program[];
  loading?: boolean;
  currentPage: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
  onBackToSearch?: () => void;
  onRemoveProgramFromList?: (programId: string) => void;
  sortOrder: 'az' | 'za' | '';
  onSortOrderChange: (order: 'az' | 'za' | '') => void;
}

function getPaginationRange(current: number, total: number, delta = 2) {
  const range = [];
  const rangeWithDots = [];
  let l;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
}

function ProgramCardSkeleton() {
  return (
    <div className="!flex-col md:!flex-row p-0 overflow-hidden shadow-none w-full max-w-4xl min-h-40 flex animate-pulse">
      {/* Left image skeleton */}
      <div className="md:shrink-0">
        <Skeleton className="w-full h-40 md:h-full md:w-48 bg-muted" />
      </div>
      {/* Right content skeleton */}
      <div className="flex flex-col justify-between flex-1 h-full p-4 min-w-0 min-h-40 sm:min-h-40">
        <div>
          <div className="flex gap-2 mb-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-6 w-2/3 mb-1 rounded" />
          <Skeleton className="h-4 w-1/2 mb-2 rounded" />
          <Skeleton className="h-4 w-1/3 mb-1 rounded" />
          <Skeleton className="h-4 w-1/4 rounded" />
        </div>
        <div className="flex justify-end mt-2">
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

const ProgramResultsList: React.FC<ProgramResultsListProps> = ({ lists, programs, loading, currentPage, pageSize, total, onPageChange, label, onBackToSearch, onRemoveProgramFromList, sortOrder, onSortOrderChange }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="my-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold flex items-center">
            {label && lists && lists.length > 0 ? (
              (() => {
                const found = lists.find(l => l.title === label || l.label === label);
                return found && found.emoji ? <span className="mr-2">{found.emoji}</span> : null;
              })()
            ) : null}
            {label || 'Programs'}
          </h2>
          <div>
            <Select value={sortOrder || undefined} onValueChange={onSortOrderChange}>
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">Institution Name (A-Z)</SelectItem>
                <SelectItem value="za">Institution Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {onBackToSearch && (
          <button
            type="button"
            className="mb-4 text-sm text-muted-foreground hover:underline flex items-center"
            onClick={onBackToSearch}
            style={{ marginBottom: 16 }}
          >
            <span className="mr-1">&#8592;</span> Back to Search
          </button>
        )}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {programs && programs.length > 0 ? (
              programs.map(program => (
                <ProgramResultCard
                  key={program._id || program.id}
                  program={{
                    id: String(program._id),
                    name: program.program_name,
                    university: program.institution?.institution_name || '',
                    country: program.institution?.institution_country || '',
                    type: program.institution?.institution_type || '',
                    ranking: '',
                    cost: 0,
                    field: program.field_of_study || '',
                    imageUrl: undefined,
                    institutionImages: program.institution?.institution_images || [],
                    malaysiaRank: program.institution?.malaysia_rank,
                    worldRank: program.institution?.world_rank,
                    intakeMonths: program.intakes || [],
                    fees: program.fees,
                  }}
                  lists={lists}
                  onRemoveProgramFromList={onRemoveProgramFromList}
                />
              ))
            ) : (
              <div className="text-muted-foreground">No programs found.</div>
            )}
          </div>
        )}
      </div>
      {/* Pagination */}
      {total > pageSize && !loading && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
              />
            </PaginationItem>
            {getPaginationRange(currentPage, Math.ceil(total / pageSize)).map((page, idx) => (
              <PaginationItem key={idx}>
                {page === '...'
                  ? <PaginationEllipsis />
                  : <PaginationLink
                      href="#"
                      isActive={currentPage === page}
                      onClick={e => {
                        e.preventDefault();
                        onPageChange(Number(page));
                      }}
                    >
                      {page}
                    </PaginationLink>
                }
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => {
                  e.preventDefault();
                  if (currentPage < Math.ceil(total / pageSize)) onPageChange(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ProgramResultsList; 