import { ModelId } from './types';

export const DEFAULT_MODEL = ModelId.FLASH;

export const MODEL_LABELS: Record<ModelId, string> = {
  [ModelId.FLASH]: 'Gemini 2.5 Flash',
  [ModelId.PRO]: 'Gemini 3.0 Pro',
  [ModelId.FLASH_LITE]: 'Gemini Flash Lite'
};

export const MODEL_DESCRIPTIONS: Record<ModelId, string> = {
  [ModelId.FLASH]: 'Best for speed and general tasks.',
  [ModelId.PRO]: 'Best for complex reasoning and coding.',
  [ModelId.FLASH_LITE]: 'Lightweight and cost-effective.'
};

export const WELCOME_SUGGESTIONS = [
  {
    icon: 'Code',
    text: 'Write a Python script to scrape a website',
    prompt: 'Write a Python script to scrape a website and save the data to a CSV file.'
  },
  {
    icon: 'Plane',
    text: 'Plan a trip to Kyoto',
    prompt: 'Plan a 5-day itinerary for a trip to Kyoto, Japan, focusing on historical sites and food.'
  },
  {
    icon: 'Brain',
    text: 'Explain quantum computing',
    prompt: 'Explain quantum computing to a 5-year-old using simple analogies.'
  },
  {
    icon: 'Image',
    text: 'Analyze this image',
    prompt: 'Describe what you see in this image in detail.'
  }
];