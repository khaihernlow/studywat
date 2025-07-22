import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Institution {
  id: string;
  institution_name: string;
  institution_country: string;
  institution_type: string;
  world_rank: number | null;
  malaysia_rank: number | null;
  program_ids: string[];
}

export function useInstitutionsApi() {
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

  // If listInstitutions requires auth, use authRequest, else keep as is
  const listInstitutions = useCallback(async (filters: {
    country?: string;
    type?: string;
    name?: string;
  } = {}): Promise<Institution[]> => {
    const params = { ...filters };
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/`, { params });
    return response.data;
  }, []);

  const listCountries = useCallback(async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/countries/`);
    return response.data;
  }, []);

  const listInstitutionNames = useCallback(async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/names/`);
    return response.data;
  }, []);

  return { listInstitutions, listCountries, listInstitutionNames };
} 