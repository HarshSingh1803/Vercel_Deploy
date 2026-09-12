import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl">Privacy notice</h1>
      <Card className="space-y-4 text-sm leading-6 text-muted">
        <p>
          GET-RISE is built so video cleaning can happen on your device. The
          cleaner reads the file in browser memory, inspects metadata with
          MediaInfo, and strips container tags with FFmpeg WebAssembly.
        </p>
        <p>
          Videos are not uploaded to Supabase Storage by default. We do not keep
          a copy of your media unless you later choose a feature that explicitly
          asks for that consent.
        </p>
        <p>
          If you create an account, Supabase stores your email, profile name, and
          optional cleaning history: original file name, sizes, file type, status,
          and which metadata categories were removed. That is activity data, not
          the video itself.
        </p>
        <p>
          Authentication uses the Supabase anonymous/publishable key in the
          browser. The service-role key must never be placed in frontend code or
          Vercel client environment variables.
        </p>
        <p>
          Cleaning is not a guarantee that every identifying trace is gone.
          Playback fields remain. Some encoder information can stay inside
          compressed bitstreams. GET-RISE only reports tags it can detect.
        </p>
        <p>
          Uploaded file contents are not written to application logs. File
          validation happens locally before processing.
        </p>
      </Card>
    </div>
  );
}
