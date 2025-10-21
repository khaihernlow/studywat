import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useProfileApi() {
  const { getValidAccessToken } = useAuth();

  // Helper to make authenticated requests with auto-refresh
  const authRequest = useCallback(async (requestFn: (token: string) => Promise<any>) => {
    let token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    try {
      return await requestFn(token);
    } catch (err: any) {
      // If 401, try refreshing once
      if (err.response && err.response.status === 401) {
        token = await getValidAccessToken();
        if (!token) throw new Error('Not authenticated');
        return await requestFn(token);
      }
      throw err;
    }
  }, [getValidAccessToken]);

  const getTraits = useCallback(async (): Promise<any[]> => {
    return authRequest(async (token) => {
      const res = await axios.get(`${API_BASE_URL}/api/v1/profile/traits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: true,
      });
      return res.data;
    });
  }, [authRequest]);

  const getCourseRecommendations = useCallback(async (userId: string) => {
    // This endpoint may or may not require auth; if it does, use authRequest
    const res = await fetch(`${API_BASE_URL}/api/v1/recommendations/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  }, []);

  return { getTraits, getCourseRecommendations };
}