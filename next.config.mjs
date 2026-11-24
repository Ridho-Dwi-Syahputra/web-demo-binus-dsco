/** @type {import('next').NextConfig} */
const config = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/data-belajar": ["data/train.csv"],
    "/data-belajar/*": ["data/train.csv"],
    "/api/data-belajar/unduh": ["data/train.csv"],
    "/api/examples": ["models/next/contoh.json"],
    "/api/predict": ["models/next/contoh.json", "models/next/ensemble.json.gz"],
    "/api/analisis": ["models/next/test_features.json.gz", "models/next/ensemble.json.gz", "data/test.csv"],
    "/api/analisis-csv": ["models/next/csv-four-week.json"],
    "/api/template-csv": ["data/test.csv", "models/next/csv-four-week.json"],
  },
};

export default config;
