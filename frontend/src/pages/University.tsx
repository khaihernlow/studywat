import { useEffect, useState, useRef } from 'react';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { Button } from '@/components/ui/button';
import { FilterPopover } from '@/components/FilterPopover';
import { X } from 'lucide-react';
import { AllFiltersPopover } from '@/components/AllFiltersPopover';
import ListCardRow from '@/components/ListCardRow';
import FieldOfStudyFilterPopover from '@/components/FieldOfStudyFilterPopover';
import ProgramResultsList from '@/components/ProgramResultsList';
import { useAuth } from '@/contexts/AuthContext';
import { useProgramsApi } from '@/services/programsApi';
import type { Program } from '@/services/programsApi';
import { useSearchParams } from 'react-router-dom';
import { useProgramListsApi } from '@/services/programLists';
import type { CreateProgramListDto, UpdateProgramListDto } from '@/services/programLists';
import { useInstitutionsApi } from '@/services/institutionsApi';

export default function Home() {
  const { setTitle } = usePageTitle();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [countryFilter, setCountryFilter] = useState<string[]>(() => searchParams.get('country') ? searchParams.get('country')!.split(',') : []);
  const [typeFilter, setTypeFilter] = useState<string[]>(() => searchParams.get('type') ? searchParams.get('type')!.split(',') : []);
  const [rankingFilter, setRankingFilter] = useState<string[]>(() => searchParams.get('ranking') ? searchParams.get('ranking')!.split(',') : []);
  const [costMin, setCostMin] = useState(1000);
  const [costMax, setCostMax] = useState(50000);
  const [fieldOfStudyCourses, setFieldOfStudyCourses] = useState<string[]>(() => searchParams.get('field') ? searchParams.get('field')!.split(',') : []);
  const [resetSignal, setResetSignal] = useState(0);
  const [universityFilter, setUniversityFilter] = useState<string[]>(() => searchParams.get('institution_name') ? searchParams.get('institution_name')!.split(',') : []);

  // Backend-driven options
  const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);
  const [universityOptions, setUniversityOptions] = useState<{ label: string; value: string }[]>([]);
  const [_loadingOptions, setLoadingOptions] = useState(true);
  const [_institutions, setInstitutions] = useState<any[]>([]); // This state is no longer used for filtering, but kept for potential future use or if other parts of the app rely on it.
  const [_loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('limit')) || 10);
  const [total, setTotal] = useState(0);

  const [lists, setLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [sortOrder, setSortOrder] = useState<'az' | 'za' | ''>('');

  const typeOptions = [
    { label: 'Public', value: 'Public' },
    { label: 'Private', value: 'Private' },
  ];
  const rankingOptions = [
    { label: 'Top 100', value: 'top100' },
    { label: 'Top 500', value: 'top500' },
    { label: 'Top 1000', value: 'top1000' },
  ];

  const anyFilterSelected = countryFilter.length > 0 || typeFilter.length > 0 || rankingFilter.length > 0 || fieldOfStudyCourses.length > 0 || universityFilter.length > 0;

  const filtersReady = useRef(false);

  const [activeList, setActiveList] = useState<any | null>(null);

  const { listCountries, listInstitutionNames, listInstitutions } = useInstitutionsApi();
  const { listPrograms, getProgramsByIds } = useProgramsApi();
  const { listByUser, create, update, delete: deleteList } = useProgramListsApi();

  // Fetch filter options on mount
  useEffect(() => {
    setTitle('University Search');
    setLoadingOptions(true);
    Promise.all([
      listCountries(),
      listInstitutionNames(),
    ]).then(([countries, names]) => {
      setCountryOptions((countries.filter(Boolean) as string[]).map((c: string) => ({ label: c, value: c })));
      setUniversityOptions((names.filter(Boolean) as string[]).map((n: string) => ({ label: n, value: n })));
    }).finally(() => setLoadingOptions(false));
  }, [setTitle, listCountries, listInstitutionNames]);

  // Fetch filtered institutions when filters change
  useEffect(() => {
    setLoadingInstitutions(true);
    listInstitutions({
      country: countryFilter[0],
      type: typeFilter[0],
      name: universityFilter[0],
    }).then(setInstitutions).finally(() => setLoadingInstitutions(false));
  }, [countryFilter, typeFilter, universityFilter, listInstitutions]);

  // Sync state with URL on filter/page change
  useEffect(() => {
    const params: any = {
      page: currentPage,
      limit: pageSize,
      ...(sortOrder ? { sort: sortOrder } : {}),
    };
    if (countryFilter.length) params.country = countryFilter.join(',');
    if (typeFilter.length) params.type = typeFilter.join(',');
    if (rankingFilter.length) params.ranking = rankingFilter.join(',');
    if (fieldOfStudyCourses.length) params.field = fieldOfStudyCourses.join(',');
    if (universityFilter.length) params.institution_name = universityFilter.join(',');
    setSearchParams(params);
  }, [countryFilter, typeFilter, rankingFilter, fieldOfStudyCourses, universityFilter, currentPage, pageSize, sortOrder, setSearchParams]);

  // Fetch programs with pagination
  useEffect(() => {
    if (activeList) return; // Prevent fetching regular programs when in list mode
    if (!filtersReady.current) {
      filtersReady.current = true;
      return;
    }
    setLoadingPrograms(true);
    listPrograms({
      field_of_study: fieldOfStudyCourses[0],
      institution_name: universityFilter.length > 0 ? universityFilter : undefined,
      institution_country: countryFilter[0],
      institution_type: typeFilter[0],
      page: currentPage,
      limit: pageSize,
      sort: sortOrder || undefined,
    }).then(res => {
      setPrograms(res.items);
      setTotal(res.total);
    }).finally(() => setLoadingPrograms(false));
  }, [fieldOfStudyCourses, typeFilter, universityFilter, countryFilter, currentPage, pageSize, activeList, sortOrder, listPrograms]);

  const fetchLists = async () => {
    if (user?.id) {
      setLoadingLists(true);
      const lists = await listByUser(user.id);
      setLists(lists.map(l => ({ ...l, id: l.id || (l as any)._id, label: l.title })));
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [user, listByUser]);

  const handleAddList = async (newListData: CreateProgramListDto) => {
    await create(newListData);
    await fetchLists();
  };

  const fetchProgramsByIds = async (ids: string[]) => {
    setLoadingPrograms(true);
    if (!ids.length) {
      setPrograms([]);
      setLoadingPrograms(false);
      return;
    }
    const items = await getProgramsByIds(ids);
    setPrograms(items);
    setLoadingPrograms(false);
  };

  const handleListClick = (list: any) => {
    setActiveList(list);
    setCountryFilter([]);
    setTypeFilter([]);
    setRankingFilter([]);
    setFieldOfStudyCourses([]);
    setUniversityFilter([]);
    setCurrentPage(1);
    setPageSize(10);
    setSearchParams({ page: '1', limit: '10' });
    fetchProgramsByIds(list.program_ids);
  };

  const handleEditList = async (id: string, updateData: UpdateProgramListDto) => {
    const updated = await update(id, updateData);
    await fetchLists();
    if (activeList && activeList.id === id) {
      setActiveList((prev: any) => ({ ...prev, ...updated }));
      fetchProgramsByIds(updated.program_ids);
    }
  };

  const handleDeleteList = async (id: string) => {
    await deleteList(id);
    await fetchLists();
    if (activeList && activeList.id === id) {
      setActiveList(null);
    }
  };

  const handleExitListMode = () => {
    setActiveList(null);
    setCurrentPage(1);
  };

  // Exit list mode if any filter changes
  useEffect(() => {
    if (!activeList) return;
    if (
      countryFilter.length > 0 ||
      typeFilter.length > 0 ||
      rankingFilter.length > 0 ||
      fieldOfStudyCourses.length > 0 ||
      universityFilter.length > 0
    ) {
      setActiveList(null);
    }
  }, [countryFilter, typeFilter, rankingFilter, fieldOfStudyCourses, universityFilter]);

  // Handler to remove a program from the current list view
  const handleRemoveProgramFromActiveList = (programId: string) => {
    setPrograms(prev => prev.filter(p => (p._id || p.id) !== programId));
  };

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [countryFilter, typeFilter, rankingFilter, fieldOfStudyCourses, universityFilter]);

  // Sort programs by institution name (frontend only for list mode)
  const getSortedPrograms = (progs: Program[]) => {
    if (!sortOrder || !activeList) return progs;
    return [...progs].sort((a, b) => {
      const aName = a.institution?.institution_name?.toLowerCase() || '';
      const bName = b.institution?.institution_name?.toLowerCase() || '';
      if (sortOrder === 'az') return aName.localeCompare(bName);
      if (sortOrder === 'za') return bName.localeCompare(aName);
      return 0;
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-row flex-wrap gap-2 items-center">
          <AllFiltersPopover
            countryOptions={countryOptions}
            typeOptions={typeOptions}
            rankingOptions={rankingOptions}
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            rankingFilter={rankingFilter}
            setRankingFilter={setRankingFilter}
            costMin={costMin}
            setCostMin={setCostMin}
            costMax={costMax}
            setCostMax={setCostMax}
            costMinLimit={0}
            costMaxLimit={100000}
          />
          <FieldOfStudyFilterPopover
            selectedCourses={fieldOfStudyCourses}
            onChange={setFieldOfStudyCourses}
            resetSignal={resetSignal}
          />
          <FilterPopover
            title="University"
            options={universityOptions}
            selectedValues={universityFilter}
            onChange={setUniversityFilter}
            popoverWidth="min-w-[20rem]"
          />
          <FilterPopover
            title="Country"
            options={countryOptions}
            selectedValues={countryFilter}
            onChange={setCountryFilter}
            popoverWidth="w-48"
          />
          <FilterPopover
            title="Type"
            options={typeOptions}
            selectedValues={typeFilter}
            onChange={setTypeFilter}
            popoverWidth="w-40"
          />
          <FilterPopover
            title="Ranking"
            options={rankingOptions}
            selectedValues={rankingFilter}
            onChange={setRankingFilter}
          />
          {anyFilterSelected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 ml-2 flex items-center gap-1"
              onClick={() => {
                setCountryFilter([]);
                setTypeFilter([]);
                setRankingFilter([]);
                setUniversityFilter([]);
                setResetSignal(s => s + 1);
              }}
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
        {user && <ListCardRow
          userId={user.id}
          lists={lists}
          onAddList={handleAddList}
          onEditList={handleEditList}
          onDeleteList={handleDeleteList}
          onListClick={handleListClick}
          loading={loadingLists}
        />}
      </div>
      <ProgramResultsList
        countryFilter={countryFilter}
        typeFilter={typeFilter}
        rankingFilter={rankingFilter}
        costMin={costMin}
        costMax={costMax}
        fieldOfStudyCourses={fieldOfStudyCourses}
        universityFilter={universityFilter}
        lists={lists}
        programs={activeList
          ? getSortedPrograms(programs).slice((currentPage - 1) * pageSize, currentPage * pageSize)
          : programs
        }
        loading={loadingPrograms}
        currentPage={currentPage}
        pageSize={pageSize}
        total={activeList ? programs.length : total}
        onPageChange={setCurrentPage}
        label={activeList ? activeList.title : 'Programs'}
        onBackToSearch={activeList ? handleExitListMode : undefined}
        onRemoveProgramFromList={activeList ? handleRemoveProgramFromActiveList : undefined}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
    </div>
  );
} 