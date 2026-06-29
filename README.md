# Corso Labs: ED Documentation Review Room

Public hackathon prototype for the Cerebras and Google DeepMind Gemma 4 hackathon.

The app demonstrates a fast, multimodal, multi-agent emergency department documentation QA workflow powered by Gemma 4 31B on Cerebras, with a GPU comparison path through OpenRouter.

## Links

- Live app: https://corso-labs-review-room.vercel.app
- Source: https://github.com/stormyeyez/corso-labs-review-room

## What It Shows

- A synthetic raster electronic medical record image.
- Gemma 4 reading image pixels for ECG, troponin, CXR, and vital-sign facts.
- An eight-step agent workflow for documentation review.
- A Cerebras physician note review packet.
- A timing comparison against an OpenRouter GPU path.
- Safety boundaries: synthetic demo only, clinician-controlled, not diagnosis or treatment.

## Demo Flow

1. Open the app.
2. Review the synthetic electronic medical record image.
3. Click **Run Live Side-by-Side Benchmark**.
4. Watch the agent timing row.
5. Review the Cerebras output and speed benchmark.

The GPU path is used for timing comparison only. The app displays the Cerebras output.

## Models

- Cerebras-hosted: `gemma-4-31b`
- OpenRouter GPU path: `google/gemma-4-31b-it`

Both provider calls run server-side. API keys are never exposed to the browser.

## Safety

This is a synthetic hackathon demo. It is not a medical device, not clinically validated, and not intended for real patient care.

The app does not diagnose, recommend treatment, determine disposition, or replace clinician judgment.

## License

MIT.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create `.env.local` from `.env.example`:

```bash
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run locally:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Verify:

```bash
pnpm test
pnpm build
```
