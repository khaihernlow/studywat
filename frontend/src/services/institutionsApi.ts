import axios from 'axios';

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

export const institutionsApi = {
  listInstitutions: async (filters: {
    country?: string;
    type?: string;
    name?: string;
  } = {}): Promise<Institution[]> => {
    const params = { ...filters };
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/`, { params });
    return response.data;
  },

  listCountries: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/countries/`);
    return response.data;
  },

  listInstitutionNames: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/institutions/names/`);
    return response.data;
  },
}; 