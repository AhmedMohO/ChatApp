import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { User } from '../../types';

const API_URL = '/api';

export const useUser = (token: string | null) => {
  return useQuery<User | null>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      if (!token) return null;
      const res = await axios.get(`${API_URL}/auth/me`);
      return res.data.data.user;
    },
    enabled: !!token,
    staleTime: Infinity, // Keep user profile cached indefinitely unless mutated
    retry: 1,
  });
};

export const useUsers = (enabled: boolean = true) => {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/auth/users`);
      return res.data.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
    retry: 2,
  });
};
