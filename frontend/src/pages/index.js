import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect root to dashboard component
    if (router.isReady) {
      router.replace('/dashboard');
    }
  }, [router.isReady]);

  return <div className="loader" style={{margin:'100px auto'}}>Loading...</div>;
}
