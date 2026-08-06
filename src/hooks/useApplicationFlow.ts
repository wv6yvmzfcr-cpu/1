/**
 * محرك أتمتة التسجيل:
 *  - جلب المتطلبات الديناميكية (عامة + خاصة بالمعهد) لتوليد المعالج تلقائياً.
 *  - فحص فوري على الجهاز قبل الرفع (الصيغة، الحجم، صلاحية الجواز 18 شهراً).
 *  - رفع المستندات إلى Bucket خاص بمسار محمي: documents/{user}/{application}/{key}
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase, type LocalizedText } from '@/lib/supabase';
import { useQuery } from './useQuery';

export interface Requirement {
  id: string;
  key: string;
  name: LocalizedText;
  description: LocalizedText;
  input_type: 'file' | 'text' | 'date' | 'select';
  validation: { formats?: string[]; max_mb?: number; min_months_valid?: number };
  is_required: boolean;
}

export interface AppDocument {
  requirement_key: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_key: string | null;
  value_text: string | null;
}

/** المتطلبات = العامة (institute_id is null) + الخاصة بهذا المعهد */
export function useRequirements(instituteId: string) {
  return useQuery<Requirement[]>(async () => {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .or(`institute_id.is.null,institute_id.eq.${instituteId}`)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  }, [instituteId]);
}

/** إنشاء مسودة طلب تبدأ من مرحلة "تجهيز المستندات" */
export async function createDraftApplication(instituteId: string, weeks: number, startMonth: string, lang: string) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('auth');
  const { data, error } = await supabase
    .from('applications')
    .insert({ user_id: userRes.user.id, institute_id: instituteId, weeks, start_month: startMonth, lang, status: 'documents' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * الفحص الفوري لتاريخ انتهاء الجواز — أكثر حاجز شيوعاً.
 * يرجع عدد الأشهر المتبقية؛ الواجهة تقارنه بـ min_months_valid وتشرح للطالب.
 */
export function monthsUntil(dateStr: string): number {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return -1;
  const now = new Date();
  return (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
}

/** اختيار ملف مع فحص الصيغة والحجم محلياً قبل أي رفع */
export async function pickAndValidate(req: Requirement): Promise<
  | { ok: true; uri: string; name: string; ext: string }
  | { ok: false; reason: 'format' | 'size' }
  | null
> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const file = res.assets[0];
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();

  const formats = req.validation.formats ?? [];
  if (formats.length && !formats.includes(ext)) return { ok: false, reason: 'format' };

  const maxBytes = (req.validation.max_mb ?? 10) * 1024 * 1024;
  if ((file.size ?? 0) > maxBytes) return { ok: false, reason: 'size' };

  return { ok: true, uri: file.uri, name: file.name, ext };
}

/** الرفع للتخزين الخاص + تسجيل صف المستند (upsert لإعادة الرفع بعد رفض) */
export async function uploadDocument(applicationId: string, key: string, uri: string, ext: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user!.id;
  const path = `${userId}/${applicationId}/${key}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const { error: upErr } = await supabase.storage
    .from('documents')
    .upload(path, decode(base64), { upsert: true, contentType: ext === 'pdf' ? 'application/pdf' : `image/${ext}` });
  if (upErr) throw upErr;

  const { error } = await supabase.from('application_documents').upsert(
    { application_id: applicationId, requirement_key: key, storage_path: path, status: 'pending', rejection_key: null },
    { onConflict: 'application_id,requirement_key' }
  );
  if (error) throw error;
}

/** حفظ متطلب نصي/تاريخ (مثل تاريخ انتهاء الجواز) */
export async function saveTextDocument(applicationId: string, key: string, value: string) {
  const { error } = await supabase.from('application_documents').upsert(
    { application_id: applicationId, requirement_key: key, value_text: value, status: 'pending', rejection_key: null },
    { onConflict: 'application_id,requirement_key' }
  );
  if (error) throw error;
}

/** عند اكتمال كل المتطلبات: نقل الطلب لمرحلة المراجعة */
export async function submitForReview(applicationId: string) {
  const { error } = await supabase.from('applications')
    .update({ status: 'review', updated_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw error;
}
