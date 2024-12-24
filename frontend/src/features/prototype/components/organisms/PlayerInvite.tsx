'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { User } from '@/features/prototype/type';
import axiosInstance from '@/utils/axiosInstance';

const PlayerInvite: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);
  const router = useRouter();
  const { groupId } = useParams();

  const fetchInvitedUsers = useCallback(async () => {
    const response = await axiosInstance.get(
      `/api/prototypes/groups/${groupId}/accessUsers`
    );
    setInvitedUsers(response.data);
  }, [groupId]);

  // グループにアクセス可能なユーザーを取得
  useEffect(() => {
    fetchInvitedUsers();
  }, [fetchInvitedUsers]);

  // ユーザーを検索
  useEffect(() => {
    if (searchTerm) {
      axiosInstance
        .get(`/api/users/search?username=${encodeURIComponent(searchTerm)}`)
        .then((response) => {
          setSuggestedUsers(response.data);
          setError(null);
        })
        .catch((error) => {
          console.error('Error fetching users:', error);
          setError('ユーザーの検索に失敗しました。');
        });
    } else {
      setSuggestedUsers([]);
    }
  }, [searchTerm]);

  // ユーザーを選択
  const handleSelectUser = (user: User) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSearchTerm('');
      setSuggestedUsers([]);
      return;
    }

    setSelectedUsers((prev) => [...prev, user]);
    setSearchTerm('');
    setSuggestedUsers([]);
  };

  // ユーザーを招待
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setError('ユーザーを選択してください。');
      return;
    }

    try {
      await axiosInstance.post(`/api/prototypes/groups/${groupId}/invite`, {
        guestIds: selectedUsers.map((user) => user.id),
      });

      setSelectedUsers([]);
      setSearchTerm('');
      setError(null);
      setSuccessMessage('招待が成功しました！');
      fetchInvitedUsers();
    } catch (error) {
      console.error('Error inviting users:', error);
      setError('プロトタイプの作成に失敗しました。');
    }
  };

  // ユーザーを削除
  const handleRemoveInvitedUser = async (userId: string) => {
    try {
      await axiosInstance.delete(
        `/api/prototypes/groups/${groupId}/invite/${userId}`
      );
      setInvitedUsers((prev) => prev.filter((user) => user.id !== userId));
      setSuccessMessage('ユーザーが削除されました。');
    } catch (error) {
      console.error('Error removing user:', error);
      setError('ユーザーの削除に失敗しました。');
    }
  };

  // 戻る
  const handleBack = () => {
    router.push(`/prototypes/groups/${groupId}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">招待者を選択</h2>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {successMessage && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="ユーザー名で検索"
        className="w-full p-2 border rounded mb-4"
      />
      <ul className="mb-4">
        {suggestedUsers.map((user) => (
          <li key={user.id} className="mb-2">
            <button
              onClick={() => handleSelectUser(user)}
              className="text-blue-500 hover:underline"
            >
              {user.username}
            </button>
          </li>
        ))}
      </ul>
      <h3 className="text-md font-bold mb-2">招待されたユーザー</h3>
      <ul className="mb-8">
        {invitedUsers.map((user) => (
          <li key={user.id} className="mb-2 flex justify-between items-center">
            {user.username}
            <button
              onClick={() => handleRemoveInvitedUser(user.id)}
              className="text-red-500 hover:underline ml-2"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <h3 className="text-md font-bold mb-2">選択されたユーザー</h3>
      <ul className="mb-2">
        {selectedUsers.map((user) => (
          <li key={user.id} className="mb-2 flex justify-between items-center">
            {user.username}
            <button
              onClick={() =>
                setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))
              }
              className="text-red-500 hover:underline ml-2"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={handleInvite}
        className="mt-4 p-2 bg-blue-500 text-white rounded"
      >
        招待
      </button>
      <button
        onClick={handleBack}
        className="mt-4 ml-2 p-2 bg-gray-500 text-white rounded"
      >
        戻る
      </button>
    </div>
  );
};

export default PlayerInvite;
