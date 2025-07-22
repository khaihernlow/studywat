import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

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

export function useProgramsApi() {
  const { getValidAccessToken } = useAuth();

  // Helper to make authenticated requests with auto-refresh
  const authRequest = useCallback(async (requestFn: (token: string) => Promise<any>) => {
    let token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    try {
      return await requestFn(token);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        token = await getValidAccessToken();
        if (!token) throw new Error('Not authenticated');
        return await requestFn(token);
      }
      throw err;
    }
  }, [getValidAccessToken]);

  // Example: if listPrograms does not require auth, keep as is
  const listPrograms = useCallback(async (filters: {
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
  }, []);

  // If getProgramsByIds requires auth, use authRequest
  const getProgramsByIds = useCallback(async (ids: string[]): Promise<Program[]> => {
    return authRequest(async (token) => {
      const response = await axios.post(`${API_BASE_URL}/api/v1/programs/by-ids`, ids, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }, [authRequest]);

  return { listPrograms, getProgramsByIds };
} 