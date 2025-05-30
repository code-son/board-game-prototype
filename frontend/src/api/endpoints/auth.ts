import axiosInstance from '@/api/client';
import { UserListData } from '@/api/types';

export const authService = {
  /**
   * ログアウトする
   */
  logout: async () => {
    await axiosInstance.post('/auth/logout');
  },
  /**
   * ユーザーを取得する
   */
  getUser: async (): Promise<UserListData> => {
    const response = await axiosInstance.get('/auth/user');
    return response.data;
  },
};
