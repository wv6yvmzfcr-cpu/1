/** بيانات شاشة متابعة الطلب: المراحل، مستندات الطلب، أسباب الرفض، والأسئلة السياقية */
import { supabase, type LocalizedText } from '@/lib/supabase';
import { useQuery } from './useQuery';
import type { AppDocument } from './useApplicationFlow';

export interface PipelineStep {
  status: string;
  step_order: number;
  title: LocalizedText;
  explanation: LocalizedText;
  your_action: LocalizedText;
  eta_days: number | null;
}

export function useTracker(applicationId: string) {
  return useQuery(async () => {
    const [app, steps, docs, reasons, faq, config] = await Promise.all([
      supabase.from('applications')
        .select('*, institutes(name, city)').eq('id', applicationId).single(),
      supabase.from('pipeline_steps').select('*').order('step_order'),
      supabase.from('application_documents').select('*').eq('application_id', applicationId),
      supabase.from('rejection_reasons').select('*'),
      supabase.from('faq').select('*').order('sort_order'),
      supabase.from('app_config').select('value').eq('key', 'mdac').maybeSingle()
    ]);
    if (app.error) throw app.error;
    return {
      app: app.data,
      steps: (steps.data ?? []) as PipelineStep[],
      docs: (docs.data ?? []) as AppDocument[],
      reasons: reasons.data ?? [],
      // FAQ السياقي: يظهر تلقائياً ما يخص المرحلة الحالية فقط
      faq: (faq.data ?? []).filter((f) => f.context_tags.includes(app.data.status)),
      mdac: config.data?.value as { official_url: string; window_days: number } | undefined
    };
  }, [applicationId]);
}
