import { useEffect, useState } from "react";
import { useApiData } from "@/api/hooks";
import { getMarketingSettings, toSettingsMap, updateMarketingSettings } from "@/api/settings";
import { userMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/**
 * Loads the marketing console's settings (seo.* / analytics.*) into editable form state, and
 * saves only the keys a page owns. `defaults` fills any key the server doesn't have yet.
 */
export function useMarketingSettings(defaults: Record<string, string>) {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApiData(getMarketingSettings, []);
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = toSettingsMap(data);
    setValues((current) => {
      const next = { ...current };
      for (const key of Object.keys(defaults)) next[key] = map[key] ?? defaults[key];
      return next;
    });
    // defaults is a module-level constant per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(after?: (saved: Record<string, string>) => void): Promise<boolean> {
    setSaving(true);
    try {
      await updateMarketingSettings(
        Object.keys(defaults).map((key) => ({ key, value: values[key]?.trim() ?? "", isPublic: true }))
      );
      after?.(values);
      toast({ variant: "success", title: "Saved", description: "Live on the website now." });
      reload();
      return true;
    } catch (err) {
      toast({ variant: "error", title: "Couldn't save", description: userMessage(err, "Please try again.") });
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { values, setValue, save, saving, loading, error };
}
