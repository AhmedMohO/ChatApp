import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../../types';

export interface UpdateProfileParams {
  username?: string;
  avatar?: string;
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, UpdateProfileParams>({
    mutationFn: async (params) => {
      // Placeholder mock since there's no backend route for user profile edits.
      const currentUser = queryClient.getQueryData<User>(['user', 'me']);
      if (!currentUser) throw new Error('User not logged in');
      return {
        ...currentUser,
        ...params,
      };
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<User>(['user', 'me'], updatedUser);
    },
  });
};
