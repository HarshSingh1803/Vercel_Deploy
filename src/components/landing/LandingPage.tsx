import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PRIVACY_LIMITATIONS, SUPPORTED_EXTENSIONS } from "@/lib/video/constants";

const features = [
  {
    title: "Private Processing",
    body: "Videos are inspected and cleaned in your browser with WebAssembly. They are not uploaded to GET-RISE storage by default.",
  },
  {
    title: "Simple & Fast",
    body: "Drop a file, review what was found, strip selected container tags, then download the cleaned copy.",
  },
  {
    title: "Metadata Control",
    body: "Choose location, timestamps, device tags, or descriptive labels. Technical playback fields stay for compatibility.",
  },
];

const steps = [
  {
    n: "01",
    title: "Upload locally",
    body: "Choose a video from your device. The file stays in browser memory.",
  },
  {
    n: "02",
    title: "Inspect metadata",
    body: "GET-RISE reads container tags that are actually present, including GPS when it exists.",
  },
  {
    n: "03",
    title: "Clean and download",
    body: "Selected tags are stripped with FFmpeg in the browser. You download the result yourself.",
  },
];

const faqs = [
  {
    q: "Do my videos leave this device?",
    a: "The cleaning pipeline runs locally. GET-RISE does not upload videos to Supabase Storage. If you are signed in, only a history record (file name, sizes, and which categories were removed) can be saved.",
  },
  {
    q: "Is every metadata field removed?",
    a: "No. Container-level tags can be stripped. Codec, resolution, duration, and similar playback data remain so the video still plays. Some encoder traces can remain inside compressed frames.",
  },
  {
    q: "Which formats are supported?",
    a: `MP4, MOV, M4V, WebM, MKV, and AVI, up to 350 MB. Stream copy is used so the picture is not re-encoded.`,
  },
  {
    q: "Do I need an account?",
    a: "No. Anyone can clean a video. An account is only required to keep cleaning history and usage stats.",
  },
];

export function LandingPage() {
  return (
    <div>
      <section className="grain relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted">
              Browser-native privacy
            </p>
            <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Rise Above Your Metadata
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              GET-RISE is a privacy-focused video metadata cleaner. Inspect hidden
              tags, choose what to remove, and download a cleaned copy — processed
              on your device, not on our servers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/clean" size="lg">
                Clean Your Video
              </Button>
              <Button href="#how-it-works" variant="secondary" size="lg">
                Learn More
              </Button>
            </div>
          </div>
          <Card className="relative overflow-hidden">
            <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
              <span>Local session</span>
              <span className="rounded-full bg-success/15 px-2 py-1 text-success">
                No upload
              </span>
            </div>
            <div className="space-y-3">
              {["GPS coordinates", "Creation timestamp", "Device model"].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <span>{item}</span>
                  <span className="text-accent">queued</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">
              A preview of the cleaner. Your actual file never leaves the browser
              during this process.
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <h2 className="font-display text-2xl">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">How it works</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Three steps. No cloud transcode queue. No silent file retention.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.n}>
              <p className="text-xs tracking-[0.2em] text-accent">{step.n}</p>
              <h3 className="mt-3 font-display text-2xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="formats" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Card>
          <h2 className="font-display text-3xl">Supported formats</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Browser processing works best with common containers up to 350 MB.
            Very large files may exceed WebAssembly memory limits.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SUPPORTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="rounded-full border border-border px-3 py-1 font-mono text-sm uppercase"
              >
                {ext}
              </span>
            ))}
          </div>
        </Card>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="font-display text-3xl">Privacy-focused FAQ</h2>
        <div className="mt-8 grid gap-4">
          {faqs.map((item) => (
            <Card key={item.q}>
              <h3 className="text-lg font-medium">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.a}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-border p-6">
          <h3 className="font-medium">What cleaning can and cannot do</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {PRIVACY_LIMITATIONS.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <Link href="/privacy" className="mt-4 inline-block text-sm text-accent">
            Read the privacy notice
          </Link>
        </div>
      </section>
    </div>
  );
}
