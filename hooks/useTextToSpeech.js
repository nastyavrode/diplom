import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

let NativeTts = null;
if (Platform.OS !== 'web') {
  try {
    NativeTts = require('react-native-tts').default;
  } catch {
    NativeTts = null;
  }
}

const MAX_CHUNK_LENGTH = 320;
const SPEECH_RATE = Platform.select({ ios: 0.5, android: 0.95, default: 0.95 });
const WEB_SPEECH_RATE = 0.95;

const isNativeTts = Boolean(NativeTts && typeof NativeTts.getInitStatus === 'function');
const isWebTts =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.speechSynthesis !== 'undefined' &&
  typeof window.SpeechSynthesisUtterance !== 'undefined';

export function isTextToSpeechSupported() {
  return isNativeTts || isWebTts;
}

let ttsReady = false;
let ttsInitPromise = null;
let activeOwnerId = null;
let chunkQueue = [];
let queueOwnerId = null;
const playbackListeners = new Map();

function emitPlaybackState(ownerId, playing) {
  playbackListeners.get(ownerId)?.(playing);
}

function splitTextIntoChunks(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  if (normalized.length <= MAX_CHUNK_LENGTH) {
    return [normalized];
  }

  const sentences = normalized.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const chunks = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = '';
    }
  };

  const pushHardSplit = (value) => {
    for (let i = 0; i < value.length; i += MAX_CHUNK_LENGTH) {
      chunks.push(value.slice(i, i + MAX_CHUNK_LENGTH));
    }
  };

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= MAX_CHUNK_LENGTH) {
      current = candidate;
      continue;
    }

    pushCurrent();
    if (sentence.length <= MAX_CHUNK_LENGTH) {
      current = sentence;
    } else {
      pushHardSplit(sentence);
    }
  }

  pushCurrent();
  return chunks.length > 0 ? chunks : [normalized.slice(0, MAX_CHUNK_LENGTH)];
}

function ensureTtsReady() {
  if (!isTextToSpeechSupported()) {
    ttsReady = false;
    return Promise.resolve();
  }

  if (isWebTts) {
    ttsReady = true;
    return Promise.resolve();
  }

  if (ttsInitPromise) return ttsInitPromise;

  ttsInitPromise = NativeTts.getInitStatus()
    .then(async () => {
      await NativeTts.setDefaultLanguage('ru-RU');
      await NativeTts.setDefaultRate(SPEECH_RATE);
      ttsReady = true;
    })
    .catch(() => {
      ttsInitPromise = null;
      ttsReady = false;
    });

  return ttsInitPromise;
}

function clearQueue() {
  chunkQueue = [];
  queueOwnerId = null;
}

function handleChunkFinished() {
  if (chunkQueue.length > 0) {
    void speakNextChunk();
    return;
  }

  const owner = queueOwnerId || activeOwnerId;
  activeOwnerId = null;
  queueOwnerId = null;
  if (owner) emitPlaybackState(owner, false);
}

async function stopGlobalSpeech() {
  const owner = queueOwnerId || activeOwnerId;
  clearQueue();
  activeOwnerId = null;

  if (isWebTts) {
    window.speechSynthesis.cancel();
  } else if (isNativeTts) {
    try {
      await NativeTts.stop();
    } catch {
      // ignore stop errors
    }
  }

  if (owner) emitPlaybackState(owner, false);
}

function speakWebChunk(text) {
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = WEB_SPEECH_RATE;

  utterance.onend = () => {
    handleChunkFinished();
  };

  utterance.onerror = () => {
    const owner = queueOwnerId || activeOwnerId;
    clearQueue();
    activeOwnerId = null;
    if (owner) emitPlaybackState(owner, false);
  };

  window.speechSynthesis.speak(utterance);
}

async function speakNextChunk() {
  if (!queueOwnerId || chunkQueue.length === 0) {
    activeOwnerId = null;
    return;
  }

  const next = chunkQueue.shift();
  if (!next) {
    activeOwnerId = null;
    return;
  }

  if (isWebTts) {
    speakWebChunk(next);
    return;
  }

  try {
    await NativeTts.speak(next);
  } catch {
    const owner = queueOwnerId || activeOwnerId;
    clearQueue();
    activeOwnerId = null;
    if (owner) emitPlaybackState(owner, false);
  }
}

function startSpeech(ownerId, text) {
  const chunks = splitTextIntoChunks(text);
  if (chunks.length === 0) return false;

  queueOwnerId = ownerId;
  activeOwnerId = ownerId;
  chunkQueue = [...chunks];
  emitPlaybackState(ownerId, true);
  void speakNextChunk();
  return true;
}

export function useTextToSpeech(text) {
  const ownerId = useId();
  const textRef = useRef(text);
  const [isPlaying, setIsPlaying] = useState(false);
  const isAvailable = isTextToSpeechSupported();

  textRef.current = text;

  useEffect(() => {
    playbackListeners.set(ownerId, setIsPlaying);
    return () => playbackListeners.delete(ownerId);
  }, [ownerId]);

  const stop = useCallback(() => {
    if (activeOwnerId !== ownerId && queueOwnerId !== ownerId) {
      setIsPlaying(false);
      return;
    }
    void stopGlobalSpeech();
  }, [ownerId]);

  const speak = useCallback(async () => {
    const value = String(textRef.current || '').trim();
    if (!value || !isAvailable) return;

    await ensureTtsReady();
    if (!ttsReady) return;

    if (activeOwnerId === ownerId) {
      stop();
      return;
    }

    await stopGlobalSpeech();
    startSpeech(ownerId, value);
  }, [ownerId, stop, isAvailable]);

  const toggle = useCallback(() => {
    if (activeOwnerId === ownerId) {
      stop();
      return;
    }
    void speak();
  }, [ownerId, speak, stop]);

  useEffect(() => {
    if (!isNativeTts) return undefined;

    const onFinish = () => {
      if (queueOwnerId !== ownerId) return;
      handleChunkFinished();
    };

    const onCancel = () => {
      if (activeOwnerId === ownerId || queueOwnerId === ownerId) {
        const owner = ownerId;
        clearQueue();
        activeOwnerId = null;
        emitPlaybackState(owner, false);
      }
    };

    NativeTts.addEventListener('tts-finish', onFinish);
    NativeTts.addEventListener('tts-cancel', onCancel);

    return () => {
      NativeTts.removeEventListener('tts-finish', onFinish);
      NativeTts.removeEventListener('tts-cancel', onCancel);
      if (activeOwnerId === ownerId || queueOwnerId === ownerId) {
        void stopGlobalSpeech();
      }
    };
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (activeOwnerId === ownerId || queueOwnerId === ownerId) {
          void stopGlobalSpeech();
        }
      };
    }, [ownerId])
  );

  return { isPlaying, speak, stop, toggle, isAvailable };
}
