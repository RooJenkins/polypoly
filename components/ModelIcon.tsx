'use client';

import { OpenAI, Claude, Gemini, Mistral, Meta, Grok, DeepSeek, Qwen } from '@lobehub/icons';

interface ModelIconProps {
  model: string;
  size?: number;
  className?: string;
}

export default function ModelIcon({ model, size = 16, className = '' }: ModelIconProps) {
  const modelLower = model.toLowerCase();

  const iconProps = {
    size,
    className,
  };

  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return <OpenAI {...iconProps} />;
  }
  if (modelLower.includes('claude')) {
    return <Claude {...iconProps} />;
  }
  if (modelLower.includes('gemini')) {
    return <Gemini {...iconProps} />;
  }
  if (modelLower.includes('mistral')) {
    return <Mistral {...iconProps} />;
  }
  if (modelLower.includes('llama')) {
    return <Meta {...iconProps} />;
  }
  if (modelLower.includes('grok')) {
    return <Grok {...iconProps} />;
  }
  if (modelLower.includes('deepseek')) {
    return <DeepSeek {...iconProps} />;
  }
  if (modelLower.includes('qwen')) {
    return <Qwen {...iconProps} />;
  }

  return <OpenAI {...iconProps} />;
}
