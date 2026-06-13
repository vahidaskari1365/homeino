import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background" dir="rtl">
          <h1 className="text-4xl font-bold text-gold mb-4">متأسفیم، مشکلی پیش آمده است.</h1>
          <p className="text-muted-foreground mb-8">
            برخی از بخش‌های سایت با خطا مواجه شدند. لطفاً صفحه را دوباره بارگذاری کنید.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-gold hover:bg-gold/90 text-white"
          >
            تلاش مجدد
          </Button>
          {import.meta.env.DEV && (
            <pre className="mt-8 p-4 bg-muted rounded text-left overflow-auto max-w-full text-xs">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
