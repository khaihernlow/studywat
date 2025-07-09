import axios from 'axios';
import qs from 'qs';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Institution {
  _id: string;
  institution_name: string;
  institution_country: string;
  institution_type: string;
  world_rank?: number;
  malaysia_rank?: number;
  program_ids: string[];
}

export interface Program {
  id: string;
  program_name: string;
  field_of_study?: string;
  location?: string;
  intakes?: string[];
  program_duration_years?: number;
  internship?: string | null;
  entry_requirements_raw?: Record<string, any>;
  english_requirements?: Record<string, any>;
  fees?: Record<string, any>;
  course_content?: Record<string, any>;
  program_type?: string;
  entry_requirements_processed?: Record<string, any>;
  _id?: string;
  institution?: Institution;
}

export interface PaginatedPrograms {
  items: Program[];
  total: number;
  page: number;
  limit: number;
}

export const programsApi = {
  listPrograms: async (filters: {
    field_of_study?: string;
    location?: string;
    program_type?: string;
    program_name?: string;
    institution_country?: string;
    institution_type?: string;
    world_rank?: number;
    malaysia_rank?: number;
    institution_name?: string[];
    page?: number;
    limit?: number;
    sort?: string;
  } = {}): Promise<PaginatedPrograms> => {
    const params = { ...filters };
    const response = await axios.get(`${API_BASE_URL}/api/v1/programs/`, {
      params,
      paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
    });
    return response.data;
  },
  getProgramsByIds: async (ids: string[]): Promise<Program[]> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/programs/by-ids`, ids);
    return response.data;
  },
}; 