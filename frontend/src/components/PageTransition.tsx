import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Força o navegador a re-aplicar a animação
      containerRef.current.style.animation = 'none';
      // Pequeno delay para garantir que o estilo foi removido
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.animation = '';
        }
      });
    }
  }, [location.pathname]);

  return (
    <div 
      ref={containerRef}
      key={location.pathname}
      className="page-transition w-full"
    >
      {children}
    </div>
  );
};

export default PageTransition;
