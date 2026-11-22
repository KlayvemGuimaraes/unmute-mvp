'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EngelWordmark } from '@/components/EngelIdentity';

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  consentConfirmed: boolean;
  onStartConversation: () => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  consentConfirmed,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  return (
    <div
      className="engel-panel mx-auto flex w-[min(92vw,32rem)] animate-fade-up flex-col items-center rounded-3xl border border-border px-6 py-8 text-center sm:px-10 sm:py-10"
    >
      <EngelWordmark />
      <h1 className="mt-7 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
        Uma conversa para organizar seu relato
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Confirme os dados e aceite o aviso de áudio antes de iniciar a entrevista.
      </p>

      <Button
        onClick={onStartConversation}
        disabled={isLoading || !consentConfirmed}
        className="mt-7 h-12 w-full max-w-sm rounded-full text-sm font-semibold"
        aria-label={
          isLoading
            ? 'Conectando à entrevista'
            : 'Iniciar conversa com consentimento confirmado'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Conectando…
          </>
        ) : (
          'Iniciar conversa'
        )}
      </Button>
      {!consentConfirmed && !isLoading && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Para iniciar, confirme os dados e aceite o aviso de áudio.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
