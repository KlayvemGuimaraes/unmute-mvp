'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { OuviraWordmark } from '@/components/OuviraIdentity';

type QuickstartConversationLayoutProps = {
  avatarName: string;
  flowName: string;
  statusPanel: ReactNode;
  audioActivation: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  audioStatus: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
  onOpenReportPreview: () => void;
};

export function QuickstartConversationLayout({
  avatarName,
  flowName,
  statusPanel,
  audioActivation,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  audioStatus,
  controls,
  onEndConversation,
  onOpenReportPreview,
}: QuickstartConversationLayoutProps) {
  return (
    <div className="ouvira-theme flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <OuviraWordmark compact />
          <div className="hidden h-10 border-l border-border sm:block" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              Conversa com {avatarName}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {flowName} · Ouvira
            </p>
            <div className="mt-1">{pipelineMetrics}</div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {statusPanel}
          {audioActivation}
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-full px-4 text-xs font-semibold sm:text-sm"
            onClick={onOpenReportPreview}
            title="Encerra a conversa atual e abre a prévia do relatório preenchido."
          >
            Abrir relatório preenchido
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-10 rounded-full border border-destructive bg-white px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 sm:text-sm"
            onClick={onEndConversation}
            aria-label="Finalizar entrevista e revisar rascunho"
          >
            Finalizar e revisar
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <main className="flex min-w-0 flex-col gap-4">
          <section className="medical-card flex min-h-[24rem] flex-col items-center justify-center gap-8 p-6 sm:min-h-[30rem] lg:min-h-[calc(100dvh-13rem)]">
            <div className="flex min-h-40 items-center justify-center px-3 py-2">
              {visualizer}
            </div>
            <div className="flex w-full max-w-2xl flex-col justify-center gap-4 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              {audioStatus}
              {controls}
            </div>
          </section>
        </main>

        <aside className="min-h-[28rem] lg:sticky lg:top-24 lg:h-[calc(100dvh-7rem)]">
          {transcriptPanel}
        </aside>
      </div>
    </div>
  );
}
