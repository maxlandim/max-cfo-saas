import json

with open('body_content.html', 'r', encoding='utf-8') as f:
    html = f.read()

react_code = """'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Auth Guard
    const user = localStorage.getItem('maxcfo_user');
    if (!user) {
      router.push('/login');
      return;
    }

    // Load original vanilla JS scripts
    const loadScript = (src) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // ensure execution order
        script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    const initScripts = async () => {
      // Prevent reloading if already loaded
      if (document.querySelector('script[src="/engine.js"]')) return;
      await loadScript('/engine.js');
      await loadScript('/app.js');
    };

    initScripts();
  }, [router]);

  return (
    <div dangerouslySetInnerHTML={{ __html: """ + json.dumps(html) + """ }} />
  );
}
"""

with open(r'app\dashboard\page.js', 'w', encoding='utf-8') as f:
    f.write(react_code)
