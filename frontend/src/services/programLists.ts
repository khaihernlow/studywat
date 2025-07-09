import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ProgramList {
  id: string;
  title: string;
  emoji: string;
  user_id: string;
  program_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProgramListDto {
  title: string;
  emoji: string;
  user_id: string;
  program_ids?: string[];
}

export interface UpdateProgramListDto {
  title?: string;
  emoji?: string;
  program_ids?: string[];
}

export const programListsApi = {
  create: async (data: CreateProgramListDto): Promise<ProgramList> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/program-lists`, data);
    return response.data;
  },

  listByUser: async (userId: string): Promise<ProgramList[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/program-lists?user_id=${userId}`);
    return response.data;
  },

  getById: async (id: string): Promise<ProgramList> => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/program-lists/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateProgramListDto): Promise<ProgramList> => {
    const response = await axios.put(`${API_BASE_URL}/api/v1/program-lists/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/v1/program-lists/${id}`);
  },
}; 