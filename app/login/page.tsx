import { Suspense } from 'react';
import { ToastProvider } from '@/components/Toast';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <ToastProvider>
      <Suspense>
        <LoginForm />
      </Suspense>
    </ToastProvider>
  );
}
