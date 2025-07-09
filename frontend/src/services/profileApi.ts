import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function getTraits(): Promise<any[]> {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_BASE_URL}/api/v1/profile/traits`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    withCredentials: true,
  });
  return res.data;
}