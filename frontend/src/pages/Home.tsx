import { useEffect } from 'react';
import { usePageTitle } from '@/contexts/PageTitleContext';

export default function Home() {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle('Home');
  }, [setTitle]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to StudyWat</h1>
      <p className="text-muted-foreground">
        Your study companion and productivity tracker.
      </p>
    </div>
  );
} 