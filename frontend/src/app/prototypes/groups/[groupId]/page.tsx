import React from 'react';
import { Metadata } from 'next';

import GroupPrototypeList from '@/features/prototype/components/organisms/GroupPrototypeList';

export const metadata: Metadata = {
  title: 'グループプロトタイプ一覧',
};

export const runtime = 'edge';
const PrototypesPage: React.FC = () => {
  return <GroupPrototypeList />;
};

export default PrototypesPage;
