"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Client component that initializes Supabase resources
 * when the app is first loaded
 */
export function SupabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initSupabase = async () => {
      try {
        // Call the init API endpoint
        const response = await fetch('/api/init');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to initialize Supabase resources');
        }

        setInitialized(true);
      } catch (err: any) {
        console.error('Error initializing Supabase:', err);
        setError(err.message || 'An error occurred during initialization');
        
        toast({
          title: 'Initialization Error',
          description: 'There was a problem setting up the application. Please try refreshing the page.',
          variant: 'destructive',
        });
      }
    };

    initSupabase();
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}

export default SupabaseInitializer;