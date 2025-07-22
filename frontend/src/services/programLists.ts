import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

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

export function useProgramListsApi() {
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

  const create = useCallback(async (data: CreateProgramListDto): Promise<ProgramList> => {
    return authRequest(async (token) => {
      const response = await axios.post(`${API_BASE_URL}/api/v1/program-lists`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }, [authRequest]);

  const listByUser = useCallback(async (userId: string): Promise<ProgramList[]> => {
    return authRequest(async (token) => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/program-lists?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }, [authRequest]);

  const getById = useCallback(async (id: string): Promise<ProgramList> => {
    return authRequest(async (token) => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/program-lists/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }, [authRequest]);

  const update = useCallback(async (id: string, data: UpdateProgramListDto): Promise<ProgramList> => {
    return authRequest(async (token) => {
      const response = await axios.put(`${API_BASE_URL}/api/v1/program-lists/${id}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.data;
    });
  }, [authRequest]);

  const del = useCallback(async (id: string): Promise<void> => {
    return authRequest(async (token) => {
      await axios.delete(`${API_BASE_URL}/api/v1/program-lists/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    });
  }, [authRequest]);

  return { create, listByUser, getById, update, delete: del };
} 