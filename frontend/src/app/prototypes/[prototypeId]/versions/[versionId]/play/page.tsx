import React from 'react';
import { Metadata } from 'next';

import PrototypePlay from '@/features/prototype/components/organisms/PrototypePlay';

export const metadata: Metadata = {
  title: 'プレイ',
};

export const runtime = 'edge';
const PrototypesPreviewPage: React.FC = () => {
  return <PrototypePlay />;
};

export default PrototypesPreviewPage;